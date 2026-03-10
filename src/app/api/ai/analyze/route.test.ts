import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/ai/analyze/route";

const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

afterEach(() => {
  if (originalKey) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
  } else {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
});

describe("/api/ai/analyze", () => {
  it("returns fallback result when API key is missing", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const req = new Request("http://localhost/api/ai/analyze", {
      method: "POST",
      body: JSON.stringify({
        content: "기록 구조를 어떻게 유지할까?",
        existingThemes: ["글쓰기"],
        activeProblems: ["어떤 질문을 먼저 남길까?"],
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("themeName");
    expect(data).toHaveProperty("problemTitle");
    expect(Array.isArray(data.tags)).toBe(true);
    expect(data).toHaveProperty("uncertaintyLabel");
    expect(Array.isArray(data.evidenceHints)).toBe(true);
    expect(data).toHaveProperty("provenance");
    expect(data).toHaveProperty("qualityGate");
  });

  it("returns 400 when content is missing", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const req = new Request("http://localhost/api/ai/analyze", {
      method: "POST",
      body: JSON.stringify({ existingThemes: [], activeProblems: [] }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
