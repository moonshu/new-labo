"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";
import {
  createId,
  defaultSuggestion,
  evaluateSuggestionQualityGate,
} from "@/lib/domain/thought-system";
import {
  Loader2,
  ArrowRightCircle,
  Sparkles,
  Save,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { ThoughtEvidence, ThoughtStatus, UncertaintyLabel } from "@/types/thought";

const STATUS_LABEL: Record<ThoughtStatus, string> = {
  DRAFT: "판단 유보",
  HESITATED: "망설임",
  CONCLUDED: "단정",
};

const EVIDENCE_TYPES: ThoughtEvidence["type"][] = [
  "internal_note",
  "external_source",
  "retrieved_doc",
];

const MAX_EDITOR_HEIGHT = 560;

function suggestionSnapshotKey(input: {
  status: ThoughtStatus;
  themeName: string;
  problemTitle: string;
  tags: string[];
  uncertaintyLabel: UncertaintyLabel;
  evidenceHints: ThoughtEvidence[];
}): string {
  const tagsKey = input.tags.map((tag) => tag.trim().toLowerCase()).sort().join("|");
  const evidenceKey = input.evidenceHints
    .map((evidence) => `${evidence.type}:${evidence.sourceRef}:${evidence.relevance}`)
    .sort()
    .join("|");

  return [
    input.status,
    input.themeName.trim(),
    input.problemTitle.trim(),
    tagsKey,
    input.uncertaintyLabel,
    evidenceKey,
  ].join("::");
}

function defaultConfidence(label: UncertaintyLabel): number {
  if (label === "LOW") return 0.8;
  if (label === "MEDIUM") return 0.6;
  return 0.4;
}

function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const raw of input) {
    const tag = raw.trim().replace(/^#/, "").replace(/\s+/g, " ").slice(0, 24);
    if (tag.length < 2) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(tag);
    if (next.length >= 8) break;
  }

  return next.length ? next : ["메모"];
}

function normalizeEvidenceHints(input: unknown): ThoughtEvidence[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const next: ThoughtEvidence[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const sourceRef =
      typeof (raw as ThoughtEvidence).sourceRef === "string"
        ? (raw as ThoughtEvidence).sourceRef.trim().replace(/\s+/g, " ")
        : "";
    if (!sourceRef) continue;
    const dedupeKey = sourceRef.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    const type = EVIDENCE_TYPES.includes((raw as ThoughtEvidence).type)
      ? (raw as ThoughtEvidence).type
      : "internal_note";
    const relevanceRaw =
      typeof (raw as ThoughtEvidence).relevance === "number" ? (raw as ThoughtEvidence).relevance : 0.6;
    const relevance = Math.max(0, Math.min(1, Number(relevanceRaw.toFixed(2))));
    const id =
      typeof (raw as ThoughtEvidence).id === "string" && (raw as ThoughtEvidence).id.trim().length
        ? (raw as ThoughtEvidence).id
        : createId("evidence");

    seen.add(dedupeKey);
    next.push({
      id,
      type,
      sourceRef,
      relevance,
    });

    if (next.length >= 8) break;
  }

  return next;
}

export default function Editor() {
  const {
    content,
    setContent,
    isFocused,
    setFocused,
    isAnalyzing,
    setAnalyzing,
    suggestion,
    originalSuggestion,
    setSuggestion,
    clearCanvas,
  } = useCanvasStore();

  const { addThought, themes, problems, selectedProblemId } = useSystemStore();

  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const lastAnalyzedContentRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedProblem = selectedProblemId
    ? problems.find((problem) => problem.id === selectedProblemId) ?? null
    : null;

  const evaluatedSuggestion = useMemo(() => {
    if (!suggestion) return null;
    return evaluateSuggestionQualityGate({
      ...suggestion,
      evidenceHints: normalizeEvidenceHints(suggestion.evidenceHints),
    });
  }, [suggestion]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.max(120, Math.min(textarea.scrollHeight, MAX_EDITOR_HEIGHT));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_EDITOR_HEIGHT ? "auto" : "hidden";
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (suggestion) {
        handleSave();
      } else {
        void handleAnalyze({ silent: false });
      }
    }
  };

  const handleAnalyze = useCallback(
    async (options?: { silent?: boolean; contentOverride?: string }) => {
      const targetContent = (options?.contentOverride ?? content).trim();
      if (!targetContent || isAnalyzing) return;

      const silent = Boolean(options?.silent);
      setAnalyzing(true);
      if (silent) {
        setIsAutoAnalyzing(true);
      } else {
        setFocused(false);
      }

      try {
        const response = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: targetContent,
            existingThemes: themes.map((theme) => theme.name),
            activeProblems: problems
              .filter((problem) => problem.status === "OPEN")
              .map((problem) => problem.title),
          }),
        });

        if (!response.ok) throw new Error("Analysis failed");

        const result = await response.json();
        const evidenceHints = normalizeEvidenceHints(result.evidenceHints);
        const analyzed = {
          problemTitle: typeof result.problemTitle === "string" ? result.problemTitle : "새 질문",
          themeName: typeof result.themeName === "string" ? result.themeName : "새 주제",
          status: (result.status as ThoughtStatus) || "DRAFT",
          tags: normalizeTags(
            Array.isArray(result.tags)
              ? result.tags.filter((item: unknown): item is string => typeof item === "string")
              : []
          ),
          uncertaintyLabel: (result.uncertaintyLabel as UncertaintyLabel) || "MEDIUM",
          evidenceHints,
          provenance:
            result.provenance && typeof result.provenance === "object"
              ? result.provenance
              : defaultSuggestion(targetContent).provenance,
          qualityGate: {
            passed: true,
            reasons: [],
          },
        };

        const gate = evaluateSuggestionQualityGate(analyzed);
        const adjusted = {
          ...analyzed,
          status:
            analyzed.status === "CONCLUDED" && !gate.passed && analyzed.evidenceHints.length === 0
              ? ("HESITATED" as ThoughtStatus)
              : analyzed.status,
        };

        setSuggestion({
          ...adjusted,
          qualityGate: evaluateSuggestionQualityGate(adjusted),
        });
        lastAnalyzedContentRef.current = targetContent;

        if (!gate.passed && !silent) {
          toast.info("근거가 부족하면 저장 시 상태를 자동으로 '유보'로 조정합니다.");
        }
      } catch (error) {
        console.error("AI Analysis failed:", error);
        const fallback = defaultSuggestion(targetContent);
        setSuggestion(fallback);
        lastAnalyzedContentRef.current = targetContent;
        if (!silent) {
          toast.warning("AI 응답이 지연되어 임시 제안을 사용합니다.");
        }
      } finally {
        setAnalyzing(false);
        if (silent) setIsAutoAnalyzing(false);
      }
    },
    [content, isAnalyzing, problems, setAnalyzing, setFocused, setSuggestion, themes]
  );

  useEffect(() => {
    const trimmed = content.trim();
    if (!trimmed) {
      lastAnalyzedContentRef.current = "";
      return;
    }
    if (trimmed.length < 8) return;
    if (trimmed === lastAnalyzedContentRef.current) return;

    const timer = window.setTimeout(() => {
      void handleAnalyze({
        silent: true,
        contentOverride: trimmed,
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [content, handleAnalyze]);

  const handleSave = () => {
    if (!content.trim()) return;

    try {
      const fallbackSuggestion = defaultSuggestion(content);
      const baseSuggestion = suggestion ? { ...suggestion } : { ...fallbackSuggestion };
      const suggestionTags = normalizeTags(baseSuggestion.tags ?? fallbackSuggestion.tags);
      const normalizedEvidence = normalizeEvidenceHints(baseSuggestion.evidenceHints);
      const downgradedStatus =
        baseSuggestion.status === "CONCLUDED" && normalizedEvidence.length === 0
          ? ("HESITATED" as ThoughtStatus)
          : baseSuggestion.status;

      const finalSuggestion = {
        ...baseSuggestion,
        status: downgradedStatus,
        tags: suggestionTags,
        evidenceHints: normalizedEvidence,
        qualityGate: evaluateSuggestionQualityGate({
          ...baseSuggestion,
          status: downgradedStatus,
          tags: suggestionTags,
          evidenceHints: normalizedEvidence,
        }),
      };

      if (baseSuggestion.status === "CONCLUDED" && downgradedStatus === "HESITATED") {
        toast.info("근거가 없어 상태를 자동으로 '유보'로 조정했습니다.");
      }

      if (!finalSuggestion.qualityGate.passed) {
        toast.error("저장 조건을 충족하지 못했습니다.", {
          description: finalSuggestion.qualityGate.reasons.join(" · "),
        });
        return;
      }

      const originalKey = originalSuggestion
        ? suggestionSnapshotKey({
            ...originalSuggestion,
            tags: normalizeTags(originalSuggestion.tags ?? []),
            evidenceHints: normalizeEvidenceHints(originalSuggestion.evidenceHints),
          })
        : "";
      const currentKey = suggestionSnapshotKey({
        ...finalSuggestion,
        tags: suggestionTags,
        evidenceHints: normalizedEvidence,
      });
      const userEditedSuggestion = Boolean(originalSuggestion && originalKey !== currentKey);

      const result = addThought(content, finalSuggestion, {
        claims: [
          {
            id: createId("claim"),
            text: content.split(/[.!?]/)[0]?.trim() || content.trim(),
            confidence: defaultConfidence(finalSuggestion.uncertaintyLabel),
            supports: [],
            attacks: [],
          },
        ],
        tags: suggestionTags,
        evidence: normalizedEvidence,
        provenance: {
          ...finalSuggestion.provenance,
          userEditedSuggestion,
        },
        userEditedSuggestion,
      });

      clearCanvas();
      toast.success(`저장됨 · ${result.problem.title}`, {
        description: result.relationsCreated
          ? `관계 ${result.relationsCreated}개가 연결되었습니다.`
          : "새 노드가 추가되었습니다.",
      });
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  const normalizedTags = suggestion ? normalizeTags(suggestion.tags ?? []) : [];
  const normalizedEvidence = suggestion ? normalizeEvidenceHints(suggestion.evidenceHints) : [];

  return (
    <div
      className={cn(
        "relative w-[40rem] max-w-full mx-auto transition-all duration-500",
        isFocused ? "opacity-100 scale-100 z-50" : "opacity-90 scale-95"
      )}
    >
      <div className="surface-panel-strong relative group ring-1 ring-primary/12 focus-within:ring-primary/30 transition-all p-1.5">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="생각을 한 번에 길게 써도 됩니다. AI가 자동으로 질문/태그/연결을 분석합니다."
          disabled={isAnalyzing}
          className="w-full min-h-[120px] bg-transparent resize-none p-4 text-lg leading-8 text-foreground placeholder:text-muted-foreground/55 focus:outline-none disabled:opacity-50 font-serif"
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
          <button
            onClick={() => void handleAnalyze({ silent: false })}
            disabled={!content.trim() || isAnalyzing}
            className="touch-target ml-auto text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors px-3 sm:px-2 py-1.5 sm:py-1 rounded-md hover:bg-primary/10"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>다시 분석</span>
                <ArrowRightCircle className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-2 px-2 text-[11px] text-muted-foreground">
        입력을 멈추면 약 1초 뒤 자동 분석됩니다.
        {isAutoAnalyzing && " · 자동 분석 중..."}
      </div>

      <AnimatePresence>
        {suggestion && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="mx-auto w-[48rem] max-w-full surface-panel-strong p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 자동 분석 결과
                </span>
                <span className="inline-flex items-center gap-1 text-[11px]">
                  {evaluatedSuggestion?.passed ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      저장 가능
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      저장 전 자동 보정 필요
                    </>
                  )}
                </span>
              </div>

              <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground space-y-1">
                <p>
                  AI가 이 글에서 자동으로 뽑는 값: <strong className="text-foreground/90">상태</strong> ·{" "}
                  <strong className="text-foreground/90">AI 질문</strong> ·{" "}
                  <strong className="text-foreground/90">태그</strong> ·{" "}
                  <strong className="text-foreground/90">근거 후보</strong>
                </p>
                <p>
                  용어 정리: <strong className="text-foreground/90">주제 묶음</strong>은 좌측에서 고르는 기록 폴더,
                  <strong className="text-foreground/90"> AI 질문</strong>은 지금 글이 답하려는 한 줄 질문입니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">AI 판단 상태</span>
                <Chip label={STATUS_LABEL[suggestion.status]} variant="primary" />
              </div>

              <div className="space-y-1 rounded-lg border border-border/50 p-2.5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">AI 질문</p>
                <p className="text-sm text-foreground/90">{suggestion.problemTitle}</p>
              </div>

              <div className="space-y-2 rounded-lg border border-border/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">AI 태그</p>
                  <span className="text-[11px] text-muted-foreground">{normalizedTags.length}개</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {normalizedTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-foreground/85"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">근거 후보</p>
                  <span className="text-[11px] text-muted-foreground">{normalizedEvidence.length}개</span>
                </div>
                {!normalizedEvidence.length ? (
                  <p className="text-xs text-muted-foreground">
                    현재 글에서 자동 감지된 근거가 없습니다. 저장 시 결론 상태는 자동으로 &quot;유보&quot;로 조정됩니다.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {normalizedEvidence.map((item) => (
                      <div key={item.id} className="rounded-md border border-border/50 p-2">
                        <p className="text-xs text-foreground/90 break-all">{item.sourceRef}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {evaluatedSuggestion && !evaluatedSuggestion.passed && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 space-y-1">
                  {evaluatedSuggestion.reasons.map((reason) => (
                    <p key={reason}>- {reason}</p>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {selectedProblem
                    ? `저장 위치(주제 묶음): ${selectedProblem.title}`
                    : "저장 위치: AI 질문 기준으로 주제 묶음을 자동 선택/생성"}
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  className="touch-target text-xs px-3 sm:px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-1 w-full sm:w-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  저장하기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({
  label,
  variant,
}: {
  label: string;
  variant: "primary" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3.5 sm:px-3 py-1.5 sm:py-1 text-xs rounded-full border border-border/50 bg-card text-muted-foreground shadow-sm",
        variant === "primary" && "border-primary/20 text-primary bg-primary/5"
      )}
    >
      {label}
    </span>
  );
}
