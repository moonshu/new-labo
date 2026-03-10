import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  applyThoughtNode,
  buildStreakData,
  calculateQualityMetrics,
  createProblem,
  createSeedData,
  exportThoughtSystemData,
  filterNodes,
  findContextNudge,
  isProblemStale,
  markProblemStatus,
  parseThoughtSystemData,
  removeProblem,
  removeThoughtNode,
  renameProblem,
  rankProblems,
  updateThoughtNode,
} from "@/lib/domain/thought-system";
import type {
  AISuggestion,
  ContextNudge,
  Problem,
  ProblemStatus,
  Relation,
  Theme,
  ThoughtClaim,
  ThoughtEvidence,
  ThoughtNode,
  ThoughtProvenance,
  ThoughtStatus,
} from "@/types/thought";

type NodeStatusFilter = ThoughtStatus | "ALL" | "WARNING" | "AI_ONLY";

function isNodeStatusFilter(value: unknown): value is NodeStatusFilter {
  return (
    value === "ALL" ||
    value === "DRAFT" ||
    value === "HESITATED" ||
    value === "CONCLUDED" ||
    value === "WARNING" ||
    value === "AI_ONLY"
  );
}

interface AddThoughtResult {
  node: ThoughtNode;
  problem: Problem;
  relationsCreated: number;
}

interface UpdateNodeResult {
  node: ThoughtNode;
  relationsCreated: number;
}

interface ImportResult {
  ok: boolean;
  error?: string;
}

interface DeleteNodeResult {
  removedNodeId: string;
}

interface DeleteProblemResult {
  removedProblemId: string;
  removedNodes: number;
}

interface SystemState {
  isSidebarOpen: boolean;
  isRightDrawerOpen: boolean;
  selectedProblemId: string | null;
  activeNodeId: string | null;
  timelineQuery: string;
  timelineStatusFilter: NodeStatusFilter;
  themes: Theme[];
  problems: Problem[];
  nodes: ThoughtNode[];
  relations: Relation[];
  toggleSidebar: () => void;
  toggleRightDrawer: () => void;
  openRightDrawer: () => void;
  closeRightDrawer: () => void;
  setSelectedProblem: (problemId: string | null) => void;
  setActiveNode: (nodeId: string | null) => void;
  setTimelineQuery: (query: string) => void;
  setTimelineStatusFilter: (filter: NodeStatusFilter) => void;
  addThought: (
    content: string,
    suggestion: AISuggestion,
    options?: {
      tags?: string[];
      claims?: ThoughtClaim[];
      evidence?: ThoughtEvidence[];
      provenance?: ThoughtProvenance;
      userEditedSuggestion?: boolean;
      fromNudgeType?: ContextNudge["type"] | null;
    }
  ) => AddThoughtResult;
  updateNode: (params: {
    nodeId: string;
    content: string;
    status: ThoughtStatus;
    tags?: string[];
    claims?: ThoughtClaim[];
    evidence?: ThoughtEvidence[];
    provenance?: ThoughtProvenance;
  }) => UpdateNodeResult;
  createProblem: (title: string) => Problem;
  renameProblem: (problemId: string, title: string) => void;
  deleteNode: (nodeId: string) => DeleteNodeResult;
  deleteProblem: (problemId: string) => DeleteProblemResult;
  setProblemStatus: (problemId: string, status: ProblemStatus) => void;
  exportData: () => string;
  importData: (raw: string) => ImportResult;
  resetData: () => void;
  getCurrentNodes: () => ThoughtNode[];
  getSortedProblems: () => Problem[];
  getStaleProblemIds: () => string[];
  getContextNudge: (content: string) => ContextNudge | null;
  getStreak: (days?: number) => Array<{ date: string; count: number; intensity: 0 | 1 | 2 | 3 | 4 }>;
  getQualityMetrics: () => ReturnType<typeof calculateQualityMetrics>;
}

const initialData = createSeedData();

export const useSystemStore = create<SystemState>()(
  persist(
    (set, get) => ({
      isSidebarOpen: true,
      isRightDrawerOpen: false,
      selectedProblemId: initialData.problems[0]?.id ?? null,
      activeNodeId: initialData.nodes[0]?.id ?? null,
      timelineQuery: "",
      timelineStatusFilter: "ALL",
      themes: initialData.themes,
      problems: initialData.problems,
      nodes: initialData.nodes,
      relations: initialData.relations,

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleRightDrawer: () => set((state) => ({ isRightDrawerOpen: !state.isRightDrawerOpen })),
      openRightDrawer: () => set({ isRightDrawerOpen: true }),
      closeRightDrawer: () => set({ isRightDrawerOpen: false }),

      setSelectedProblem: (selectedProblemId) =>
        set((state) => ({
          selectedProblemId,
          activeNodeId: selectedProblemId
            ? state.nodes.find((node) => node.problemId === selectedProblemId)?.id ?? null
            : state.nodes[0]?.id ?? null,
        })),

      setActiveNode: (activeNodeId) => set({ activeNodeId }),
      setTimelineQuery: (timelineQuery) => set({ timelineQuery }),
      setTimelineStatusFilter: (timelineStatusFilter) => set({ timelineStatusFilter }),

      addThought: (content, suggestion, options) => {
        const current = get();
        const { nextState, node, problem, createdRelations } = applyThoughtNode(
          {
            themes: current.themes,
            problems: current.problems,
            nodes: current.nodes,
            relations: current.relations,
          },
          {
            content,
            suggestion,
            selectedProblemId: current.selectedProblemId,
            tags: options?.tags,
            claims: options?.claims,
            evidence: options?.evidence,
            provenance: options?.provenance,
            userEditedSuggestion: options?.userEditedSuggestion,
            fromNudgeType: options?.fromNudgeType,
          }
        );

        set({
          themes: nextState.themes,
          problems: nextState.problems,
          nodes: nextState.nodes,
          relations: nextState.relations,
          selectedProblemId: node.problemId,
          activeNodeId: node.id,
          isRightDrawerOpen: true,
        });

        return {
          node,
          problem,
          relationsCreated: createdRelations.length,
        };
      },

      updateNode: (params) => {
        const current = get();
        const { nextState, updatedNode, relationsCreated } = updateThoughtNode(
          {
            themes: current.themes,
            problems: current.problems,
            nodes: current.nodes,
            relations: current.relations,
          },
          params
        );

        set({
          themes: nextState.themes,
          problems: nextState.problems,
          nodes: nextState.nodes,
          relations: nextState.relations,
          activeNodeId: updatedNode.id,
          isRightDrawerOpen: true,
        });

        return {
          node: updatedNode,
          relationsCreated: relationsCreated.length,
        };
      },

      createProblem: (title) => {
        const current = get();
        const result = createProblem(current.problems, title);

        set({
          problems: result.problems,
          selectedProblemId: result.problem.id,
          activeNodeId:
            current.nodes.find((node) => node.problemId === result.problem.id)?.id ?? null,
        });

        return result.problem;
      },

      renameProblem: (problemId, title) =>
        set((state) => ({
          problems: renameProblem(state.problems, problemId, title),
        })),

      deleteNode: (nodeId) => {
        const current = get();
        const { nextState, removedNode } = removeThoughtNode(
          {
            themes: current.themes,
            problems: current.problems,
            nodes: current.nodes,
            relations: current.relations,
          },
          nodeId
        );

        const nextActiveNodeId =
          current.activeNodeId === nodeId
            ? nextState.nodes.find((node) =>
                current.selectedProblemId
                  ? node.problemId === current.selectedProblemId
                  : true
              )?.id ?? null
            : current.activeNodeId;

        set({
          themes: nextState.themes,
          problems: nextState.problems,
          nodes: nextState.nodes,
          relations: nextState.relations,
          activeNodeId: nextActiveNodeId,
          isRightDrawerOpen: Boolean(nextActiveNodeId),
        });

        return {
          removedNodeId: removedNode.id,
        };
      },

      deleteProblem: (problemId) => {
        const current = get();
        const removedNodes = current.nodes.filter((node) => node.problemId === problemId).length;
        const { nextState, removedProblem } = removeProblem(
          {
            themes: current.themes,
            problems: current.problems,
            nodes: current.nodes,
            relations: current.relations,
          },
          problemId
        );

        const fallbackProblemId = nextState.problems[0]?.id ?? null;
        const nextSelectedProblemId =
          current.selectedProblemId === problemId ? fallbackProblemId : current.selectedProblemId;

        const nextActiveNodeId =
          nextSelectedProblemId
            ? nextState.nodes.find((node) => node.problemId === nextSelectedProblemId)?.id ?? null
            : nextState.nodes[0]?.id ?? null;

        set({
          themes: nextState.themes,
          problems: nextState.problems,
          nodes: nextState.nodes,
          relations: nextState.relations,
          selectedProblemId: nextSelectedProblemId,
          activeNodeId: nextActiveNodeId,
          isRightDrawerOpen: Boolean(nextActiveNodeId),
        });

        return {
          removedProblemId: removedProblem.id,
          removedNodes,
        };
      },

      setProblemStatus: (problemId, status) =>
        set((state) => ({
          problems: markProblemStatus(state.problems, problemId, status),
        })),

      exportData: () => {
        const state = get();
        return exportThoughtSystemData({
          themes: state.themes,
          problems: state.problems,
          nodes: state.nodes,
          relations: state.relations,
        });
      },

      importData: (raw) => {
        const parsed = parseThoughtSystemData(raw);
        if (!parsed.ok) {
          return { ok: false, error: parsed.error };
        }

        const nextSelectedProblemId = parsed.data.problems[0]?.id ?? null;
        const nextActiveNodeId = parsed.data.nodes[0]?.id ?? null;

        set({
          themes: parsed.data.themes,
          problems: parsed.data.problems,
          nodes: parsed.data.nodes,
          relations: parsed.data.relations,
          selectedProblemId: nextSelectedProblemId,
          activeNodeId: nextActiveNodeId,
          timelineQuery: "",
          timelineStatusFilter: "ALL",
          isRightDrawerOpen: false,
        });

        return { ok: true };
      },

      resetData: () => {
        const seed = createSeedData();
        set({
          themes: seed.themes,
          problems: seed.problems,
          nodes: seed.nodes,
          relations: seed.relations,
          selectedProblemId: seed.problems[0]?.id ?? null,
          activeNodeId: seed.nodes[0]?.id ?? null,
          timelineQuery: "",
          timelineStatusFilter: "ALL",
          isRightDrawerOpen: false,
        });
      },

      getCurrentNodes: () => {
        const state = get();
        const scoped = state.selectedProblemId
          ? state.nodes.filter((node) => node.problemId === state.selectedProblemId)
          : state.nodes;

        const filtered = filterNodes(scoped, state.timelineQuery, state.timelineStatusFilter);

        return [...filtered].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        );
      },

      getSortedProblems: () => rankProblems(get().problems),

      getStaleProblemIds: () =>
        get()
          .problems.filter((problem) => isProblemStale(problem))
          .map((problem) => problem.id),

      getContextNudge: (content) => {
        const state = get();
        return findContextNudge({
          content,
          nodes: state.nodes,
          problems: state.problems,
        });
      },

      getStreak: (days = 70) => buildStreakData(get().nodes, days),

      getQualityMetrics: () => {
        const state = get();
        return calculateQualityMetrics(state.nodes, state.problems);
      },
    }),
    {
      name: "thought-system-store-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        selectedProblemId: state.selectedProblemId,
        activeNodeId: state.activeNodeId,
        timelineQuery: state.timelineQuery,
        timelineStatusFilter: state.timelineStatusFilter,
        themes: state.themes,
        problems: state.problems,
        nodes: state.nodes,
        relations: state.relations,
      }),
      version: 5,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return {
            ...initialData,
            isSidebarOpen: true,
            isRightDrawerOpen: false,
            selectedProblemId: initialData.problems[0]?.id ?? null,
            activeNodeId: initialData.nodes[0]?.id ?? null,
            timelineQuery: "",
            timelineStatusFilter: "ALL",
          };
        }

        const maybeState = persistedState as Partial<SystemState>;

        if (version < 5) {
          const parsed = parseThoughtSystemData(
            JSON.stringify({
              themes: Array.isArray(maybeState.themes) ? maybeState.themes : initialData.themes,
              problems: Array.isArray(maybeState.problems) ? maybeState.problems : initialData.problems,
              nodes: Array.isArray(maybeState.nodes) ? maybeState.nodes : initialData.nodes,
              relations: Array.isArray(maybeState.relations) ? maybeState.relations : initialData.relations,
            })
          );

          if (!parsed.ok) {
            return {
              ...initialData,
              isSidebarOpen: true,
              isRightDrawerOpen: false,
              selectedProblemId: initialData.problems[0]?.id ?? null,
              activeNodeId: initialData.nodes[0]?.id ?? null,
              timelineQuery: "",
              timelineStatusFilter: "ALL",
            };
          }

          return {
            ...parsed.data,
            isSidebarOpen: typeof maybeState.isSidebarOpen === "boolean" ? maybeState.isSidebarOpen : true,
            isRightDrawerOpen: false,
            selectedProblemId: maybeState.selectedProblemId ?? parsed.data.problems[0]?.id ?? null,
            activeNodeId: maybeState.activeNodeId ?? parsed.data.nodes[0]?.id ?? null,
            timelineQuery: maybeState.timelineQuery ?? "",
            timelineStatusFilter: isNodeStatusFilter(maybeState.timelineStatusFilter)
              ? maybeState.timelineStatusFilter
              : "ALL",
          };
        }

        return persistedState as SystemState;
      },
    }
  )
);
