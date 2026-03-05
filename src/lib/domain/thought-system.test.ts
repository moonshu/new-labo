import { describe, expect, it } from "vitest";
import {
  applyThoughtNode,
  buildStreakData,
  calculateQualityMetrics,
  createProblem,
  createDefaultProvenance,
  createSeedData,
  defaultSuggestion,
  removeProblem,
  removeThoughtNode,
  renameProblem,
  exportThoughtSystemData,
  filterNodes,
  findContextNudge,
  isProblemStale,
  parseThoughtSystemData,
  evaluateSuggestionQualityGate,
  updateThoughtNode,
} from "@/lib/domain/thought-system";
import type { Problem, ThoughtNode } from "@/types/thought";

function makeNode(params: Partial<ThoughtNode> & Pick<ThoughtNode, "id" | "content" | "createdAt" | "problemId" | "themeId">): ThoughtNode {
  return {
    id: params.id,
    content: params.content,
    status: params.status ?? "DRAFT",
    createdAt: params.createdAt,
    problemId: params.problemId,
    themeId: params.themeId,
    claims: params.claims ?? [
      {
        id: `${params.id}_claim`,
        text: params.content,
        confidence: 0.5,
        supports: [],
        attacks: [],
      },
    ],
    evidence: params.evidence ?? [],
    provenance:
      params.provenance ??
      createDefaultProvenance({
        generatedAt: params.createdAt,
        source: "manual",
      }),
    hasEvidenceWarning: params.hasEvidenceWarning ?? false,
  };
}

describe("thought-system domain", () => {
  it("adds thought node and updates selected problem", () => {
    const base = createSeedData("2026-03-05T10:00:00.000Z");
    const selectedProblemId = base.problems[0].id;
    const suggestion = defaultSuggestion("기록 흐름을 확장하기 위해 질문 중심 구조를 유지해보자.");

    const result = applyThoughtNode(
      base,
      {
        content: "기록 흐름을 확장하기 위해 질문 중심 구조를 유지해보자.",
        selectedProblemId,
        suggestion: {
          ...suggestion,
          status: "HESITATED",
          themeName: "글쓰기",
          problemTitle: "무시될 텍스트",
        },
      },
      "2026-03-05T12:00:00.000Z"
    );

    expect(result.nextState.nodes).toHaveLength(base.nodes.length + 1);
    expect(result.node.problemId).toBe(selectedProblemId);
    expect(result.nextState.problems.find((problem) => problem.id === selectedProblemId)?.relatedNodeIds[0]).toBe(
      result.node.id
    );
  });

  it("marks stale problems only when OPEN and older than 72h", () => {
    const staleProblem: Problem = {
      id: "problem_stale",
      title: "stale",
      status: "OPEN",
      createdAt: "2026-02-20T00:00:00.000Z",
      lastThoughtAt: "2026-02-28T00:00:00.000Z",
      relatedNodeIds: [],
    };

    const pendingProblem: Problem = {
      ...staleProblem,
      id: "problem_pending",
      status: "PENDING",
    };

    expect(isProblemStale(staleProblem, "2026-03-05T00:00:00.000Z")).toBe(true);
    expect(isProblemStale(pendingProblem, "2026-03-05T00:00:00.000Z")).toBe(false);
  });

  it("builds streak data with normalized intensity", () => {
    const nodes: ThoughtNode[] = [
      makeNode({
        id: "n1",
        content: "a",
        status: "DRAFT",
        createdAt: "2026-03-01T09:00:00.000Z",
        problemId: "p1",
        themeId: "t1",
      }),
      makeNode({
        id: "n2",
        content: "b",
        status: "DRAFT",
        createdAt: "2026-03-01T10:00:00.000Z",
        problemId: "p1",
        themeId: "t1",
      }),
      makeNode({
        id: "n3",
        content: "c",
        status: "DRAFT",
        createdAt: "2026-03-03T09:00:00.000Z",
        problemId: "p1",
        themeId: "t1",
      }),
    ];

    const streak = buildStreakData(nodes, 5, "2026-03-05T00:00:00.000Z");

    expect(streak).toHaveLength(5);
    expect(Math.max(...streak.map((day) => day.intensity))).toBe(4);
    expect(streak.some((day) => day.count === 2)).toBe(true);
  });

  it("suggests revisit nudge when content is empty and stale problems exist", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");

    const nudge = findContextNudge({
      content: "",
      nodes: base.nodes,
      problems: base.problems,
      now: "2026-03-05T00:00:00.000Z",
    });

    expect(nudge?.type).toBe("revisit");
    expect(nudge?.targetProblemId).toBeTruthy();
  });

  it("suggests link nudge when content overlaps existing thought", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");

    const nudge = findContextNudge({
      content: "질문을 먼저 적으면 흐름이 끊기지 않는다.",
      nodes: base.nodes,
      problems: base.problems,
      now: "2026-03-05T00:00:00.000Z",
    });

    expect(nudge?.type).toBe("link");
    expect(nudge?.targetNodeId).toBeTruthy();
  });

  it("filters nodes by query and status", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const filtered = filterNodes(base.nodes, "정답", "CONCLUDED");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe("CONCLUDED");
  });

  it("filters nodes by warning and ai-only views", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const flaggedNode = {
      ...base.nodes[0],
      id: "warn_node",
      status: "CONCLUDED" as const,
      hasEvidenceWarning: true,
      provenance: {
        ...base.nodes[0].provenance,
        source: "ai" as const,
      },
    };

    const warningFiltered = filterNodes([flaggedNode, ...base.nodes], "", "WARNING");
    const aiFiltered = filterNodes([flaggedNode, ...base.nodes], "", "AI_ONLY");

    expect(warningFiltered.every((node) => node.hasEvidenceWarning)).toBe(true);
    expect(
      aiFiltered.every(
        (node) => node.provenance.source === "ai" || node.provenance.source === "fallback"
      )
    ).toBe(true);
  });

  it("updates node content/status and recalculates relations", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const nodeId = base.nodes[0].id;

    const updated = updateThoughtNode(
      base,
      {
        nodeId,
        content: "기록 구조를 수정해서 관계를 다시 확인한다.",
        status: "CONCLUDED",
        evidence: [
          {
            id: "ev_update",
            type: "internal_note",
            sourceRef: "node_2",
            relevance: 0.7,
          },
        ],
      },
      "2026-03-05T12:00:00.000Z"
    );

    expect(updated.updatedNode.status).toBe("CONCLUDED");
    expect(updated.nextState.nodes.find((node) => node.id === nodeId)?.content).toContain("수정");
    expect(updated.nextState.relations.every((relation) => relation.sourceNodeId || relation.targetNodeId)).toBe(true);
  });

  it("prevents saving concluded node without evidence", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const suggestion = {
      ...defaultSuggestion("이건 확실한 결론이다."),
      status: "CONCLUDED" as const,
      evidenceHints: [],
    };

    expect(() =>
      applyThoughtNode(
        base,
        {
          content: "이건 확실한 결론이다.",
          suggestion,
        },
        "2026-03-05T12:00:00.000Z"
      )
    ).toThrowError("결론 상태에는 최소 1개의 근거가 필요합니다.");
  });

  it("computes quality metrics in normalized range", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const metrics = calculateQualityMetrics(base.nodes, base.problems, "2026-03-05T00:00:00.000Z");

    expect(metrics.evidenceCoverage).toBeGreaterThanOrEqual(0);
    expect(metrics.evidenceCoverage).toBeLessThanOrEqual(1);
    expect(metrics.hallucinationProxy).toBeGreaterThanOrEqual(0);
    expect(metrics.hallucinationProxy).toBeLessThanOrEqual(1);
    expect(metrics.overrideRate).toBeGreaterThanOrEqual(0);
    expect(metrics.overrideRate).toBeLessThanOrEqual(1);
    expect(metrics.reflectionCompletionRate).toBeGreaterThanOrEqual(0);
    expect(metrics.reflectionCompletionRate).toBeLessThanOrEqual(1);
  });

  it("deduplicates evidences and cleans invalid claim links", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const suggestion = {
      ...defaultSuggestion("결론을 저장한다."),
      status: "CONCLUDED" as const,
      evidenceHints: [
        {
          id: "ev1",
          type: "external_source" as const,
          sourceRef: "https://example.com/paper",
          relevance: 0.7,
        },
      ],
    };

    const result = applyThoughtNode(base, {
      content: "결론을 저장한다.",
      suggestion,
      claims: [
        {
          id: "c1",
          text: "주장 1",
          confidence: 0.7,
          supports: ["c2", "c1"],
          attacks: ["c2", "c3"],
        },
        {
          id: "c2",
          text: "주장 2",
          confidence: 0.6,
          supports: ["c1"],
          attacks: [],
        },
      ],
      evidence: [
        {
          id: "e1",
          type: "external_source",
          sourceRef: "https://example.com/paper",
          relevance: 0.7,
        },
        {
          id: "e2",
          type: "external_source",
          sourceRef: "https://example.com/paper",
          relevance: 0.9,
        },
      ],
    });

    expect(result.node.evidence).toHaveLength(1);
    expect(result.node.claims[0].supports.includes("c1")).toBe(false);
    expect(result.node.claims[0].attacks.includes("c3")).toBe(false);
  });

  it("prevents updating concluded node without evidence", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const nodeId = base.nodes[1].id;

    expect(() =>
      updateThoughtNode(
        base,
        {
          nodeId,
          content: "결론으로 바꾼다",
          status: "CONCLUDED",
          evidence: [],
        },
        "2026-03-05T12:00:00.000Z"
      )
    ).toThrowError("결론 상태에는 최소 1개의 근거가 필요합니다.");
  });

  it("fails quality gate for concluded suggestion without evidence", () => {
    const suggestion = {
      ...defaultSuggestion("이건 결론이다."),
      status: "CONCLUDED" as const,
      evidenceHints: [],
      uncertaintyLabel: "HIGH" as const,
    };

    const gate = evaluateSuggestionQualityGate(suggestion);
    expect(gate.passed).toBe(false);
    expect(gate.reasons.length).toBeGreaterThan(0);
  });

  it("exports and re-imports valid thought system snapshot", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const raw = exportThoughtSystemData(base);
    const parsed = parseThoughtSystemData(raw);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.nodes.length).toBe(base.nodes.length);
      expect(parsed.data.problems.length).toBe(base.problems.length);
    }
  });

  it("repairs imported claim/evidence integrity", () => {
    const raw = JSON.stringify({
      themes: [{ id: "t1", name: "사유", createdAt: "2026-03-01T00:00:00.000Z" }],
      problems: [
        {
          id: "p1",
          title: "질문",
          status: "OPEN",
          createdAt: "2026-03-01T00:00:00.000Z",
          lastThoughtAt: "2026-03-01T00:00:00.000Z",
          relatedNodeIds: [],
        },
      ],
      nodes: [
        {
          id: "n1",
          content: "결론 문장",
          status: "CONCLUDED",
          createdAt: "2026-03-02T00:00:00.000Z",
          problemId: "p1",
          themeId: "t1",
          claims: [
            {
              id: "c1",
              text: "주장 1",
              confidence: 0.7,
              supports: ["c1", "c2"],
              attacks: ["c2", "c3"],
            },
            {
              id: "c2",
              text: "주장 2",
              confidence: 0.6,
              supports: [],
              attacks: [],
            },
          ],
          evidence: [
            {
              id: "e1",
              type: "external_source",
              sourceRef: "https://example.com/paper",
              relevance: 0.7,
            },
            {
              id: "e2",
              type: "external_source",
              sourceRef: "https://example.com/paper",
              relevance: 0.9,
            },
            {
              id: "e3",
              type: "internal_note",
              sourceRef: "   ",
              relevance: 0.4,
            },
          ],
          provenance: {
            analyzerVersion: "manual-v1",
            promptHash: "manual",
            retrievalIds: [],
            generatedAt: "2026-03-02T00:00:00.000Z",
            source: "manual",
            userEditedSuggestion: false,
            fromNudgeType: null,
          },
        },
      ],
      relations: [],
    });

    const parsed = parseThoughtSystemData(raw);
    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      const node = parsed.data.nodes[0];
      expect(node.evidence).toHaveLength(1);
      expect(node.claims[0].supports).toEqual(["c2"]);
      expect(node.claims[0].attacks).toEqual([]);
      expect(node.hasEvidenceWarning).toBe(false);
    }
  });

  it("rejects invalid snapshot format", () => {
    const parsed = parseThoughtSystemData("{\"foo\":1}");
    expect(parsed.ok).toBe(false);
  });

  it("creates and renames problem", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const created = createProblem(base.problems, "새로운 질문");
    expect(created.problems.length).toBe(base.problems.length + 1);

    const renamed = renameProblem(created.problems, created.problem.id, "수정된 질문");
    expect(renamed.find((problem) => problem.id === created.problem.id)?.title).toBe("수정된 질문");
  });

  it("removes node and updates relations/problem links", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const targetId = base.nodes[0].id;
    const removed = removeThoughtNode(base, targetId);

    expect(removed.nextState.nodes.some((node) => node.id === targetId)).toBe(false);
    expect(
      removed.nextState.relations.every(
        (relation) => relation.sourceNodeId !== targetId && relation.targetNodeId !== targetId
      )
    ).toBe(true);
  });

  it("removes problem and linked nodes", () => {
    const base = createSeedData("2026-03-05T00:00:00.000Z");
    const problemId = base.problems[0].id;
    const removed = removeProblem(base, problemId);

    expect(removed.nextState.problems.some((problem) => problem.id === problemId)).toBe(false);
    expect(removed.nextState.nodes.some((node) => node.problemId === problemId)).toBe(false);
  });
});
