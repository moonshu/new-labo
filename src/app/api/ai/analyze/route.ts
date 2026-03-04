import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { AI_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  defaultSuggestion,
  evaluateSuggestionQualityGate,
  normalizeLabel,
} from "@/lib/domain/thought-system";

export const maxDuration = 30;

function pickClosestLabel(content: string, candidates: string[], fallback: string) {
  if (!candidates.length) return fallback;

  const lowered = content.toLowerCase();
  const matched = candidates.find((candidate) =>
    candidate
      .toLowerCase()
      .split(/\s+/)
      .some((token) => token.length > 1 && lowered.includes(token))
  );

  return matched ?? candidates[0];
}

function shortHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

function fallbackAnalyze(content: string, existingThemes: string[], activeProblems: string[]) {
  const fallback = defaultSuggestion(content);

  const suggestion = {
    ...fallback,
    themeName: pickClosestLabel(content, existingThemes, fallback.themeName),
    problemTitle: pickClosestLabel(content, activeProblems, fallback.problemTitle),
    provenance: {
      ...fallback.provenance,
      analyzerVersion: "fallback-analyzer-v2",
      promptHash: `fallback-${shortHash(content)}`,
      retrievalIds: fallback.evidenceHints.map((item) => item.id),
      generatedAt: new Date().toISOString(),
      source: "fallback" as const,
    },
  };

  return {
    ...suggestion,
    qualityGate: evaluateSuggestionQualityGate(suggestion),
  };
}

const suggestionSchema = z.object({
  status: z.enum(["DRAFT", "HESITATED", "CONCLUDED"]),
  themeName: z.string().min(1),
  problemTitle: z.string().min(1),
  uncertaintyLabel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  evidenceHints: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum(["internal_note", "external_source", "retrieved_doc"]),
        sourceRef: z.string().min(1),
        relevance: z.number().min(0).max(1),
      })
    )
    .max(5),
});

export async function POST(req: Request) {
  let content = "";
  let existingThemes: string[] = [];
  let activeProblems: string[] = [];

  try {
    const payload = await req.json();
    content = typeof payload?.content === "string" ? payload.content : "";
    existingThemes = Array.isArray(payload?.existingThemes)
      ? payload.existingThemes.filter((value: unknown): value is string => typeof value === "string")
      : [];
    activeProblems = Array.isArray(payload?.activeProblems)
      ? payload.activeProblems.filter((value: unknown): value is string => typeof value === "string")
      : [];

    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Content is required" }), { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify(fallbackAnalyze(content, existingThemes, activeProblems)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { object } = await generateObject({
      model: google("gemini-1.5-pro-latest"),
      system: AI_SYSTEM_PROMPT,
      prompt: `
[현재 존재하는 주제 풀(Themes)]: ${existingThemes.length ? existingThemes.join(", ") : "없음"}
[현재 당면한 문제 풀(Problems)]: ${activeProblems.length ? activeProblems.join(", ") : "없음"}

[사용자 입력 원문]:
"${content}"

상기 규칙을 따라 구조화된 JSON만 반환하세요.`,
      schema: suggestionSchema,
    });

    const normalized = {
      ...object,
      themeName: normalizeLabel(object.themeName, "사유"),
      problemTitle: normalizeLabel(object.problemTitle, "이 생각은 어떤 질문에 답하려는가?"),
    };

    const suggestion = {
      ...normalized,
      provenance: {
        analyzerVersion: "gemini-1.5-pro-latest",
        promptHash: `ai-analyze-v2-${shortHash(content)}`,
        retrievalIds: normalized.evidenceHints.map((item) => item.id),
        generatedAt: new Date().toISOString(),
        source: "ai" as const,
        userEditedSuggestion: false,
        fromNudgeType: null,
      },
      qualityGate: {
        passed: true,
        reasons: [],
      },
    };

    const qualityGate = evaluateSuggestionQualityGate(suggestion);

    return new Response(
      JSON.stringify({
        ...suggestion,
        qualityGate,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error("AI Analysis Error:", error);
    const safeContent = content || "기록의 맥락을 다시 정리해볼 수 있을까?";
    return new Response(JSON.stringify(fallbackAnalyze(safeContent, existingThemes, activeProblems)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
