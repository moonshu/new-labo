import { describe, expect, it } from "vitest";
import {
  applyThoughtNode,
  buildStreakData,
  createSeedData,
  findContextNudge,
  isProblemStale,
} from "@/lib/domain/thought-system";
import type { Problem, ThoughtNode } from "@/types/thought";

describe("thought-system domain", () => {
  it("adds thought node and updates selected problem", () => {
    const base = createSeedData("2026-03-05T10:00:00.000Z");
    const selectedProblemId = base.problems[0].id;

    const result = applyThoughtNode(
      base,
      {
        content: "기록 흐름을 확장하기 위해 질문 중심 구조를 유지해보자.",
        selectedProblemId,
        suggestion: {
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
      {
        id: "n1",
        content: "a",
        status: "DRAFT",
        createdAt: "2026-03-01T09:00:00.000Z",
        problemId: "p1",
        themeId: "t1",
      },
      {
        id: "n2",
        content: "b",
        status: "DRAFT",
        createdAt: "2026-03-01T10:00:00.000Z",
        problemId: "p1",
        themeId: "t1",
      },
      {
        id: "n3",
        content: "c",
        status: "DRAFT",
        createdAt: "2026-03-03T09:00:00.000Z",
        problemId: "p1",
        themeId: "t1",
      },
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
});
