import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
    applyThoughtNode,
    buildStreakData,
    createSeedData,
    findContextNudge,
    isProblemStale,
    markProblemStatus,
    rankProblems,
} from "@/lib/domain/thought-system";
import type {
    AISuggestion,
    ContextNudge,
    Problem,
    ProblemStatus,
    Relation,
    Theme,
    ThoughtNode,
} from "@/types/thought";

interface AddThoughtResult {
    node: ThoughtNode;
    problem: Problem;
    relationsCreated: number;
}

interface SystemState {
    isSidebarOpen: boolean;
    isRightDrawerOpen: boolean;
    selectedProblemId: string | null;
    activeNodeId: string | null;
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
    addThought: (content: string, suggestion: AISuggestion) => AddThoughtResult;
    setProblemStatus: (problemId: string, status: ProblemStatus) => void;
    getCurrentNodes: () => ThoughtNode[];
    getSortedProblems: () => Problem[];
    getStaleProblemIds: () => string[];
    getContextNudge: (content: string) => ContextNudge | null;
    getStreak: (days?: number) => Array<{ date: string; count: number; intensity: 0 | 1 | 2 | 3 | 4 }>;
}

const initialData = createSeedData();

export const useSystemStore = create<SystemState>()(
    persist(
        (set, get) => ({
            isSidebarOpen: true,
            isRightDrawerOpen: false,
            selectedProblemId: initialData.problems[0]?.id ?? null,
            activeNodeId: initialData.nodes[0]?.id ?? null,
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
                    activeNodeId:
                        selectedProblemId
                            ? state.nodes.find((node) => node.problemId === selectedProblemId)?.id ?? null
                            : state.nodes[0]?.id ?? null,
                })),

            setActiveNode: (activeNodeId) => set({ activeNodeId }),

            addThought: (content, suggestion) => {
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

            setProblemStatus: (problemId, status) =>
                set((state) => ({
                    problems: markProblemStatus(state.problems, problemId, status),
                })),

            getCurrentNodes: () => {
                const state = get();
                const filtered = state.selectedProblemId
                    ? state.nodes.filter((node) => node.problemId === state.selectedProblemId)
                    : state.nodes;

                return [...filtered].sort(
                    (left, right) =>
                        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
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
        }),
        {
            name: "thought-system-store-v2",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                isSidebarOpen: state.isSidebarOpen,
                selectedProblemId: state.selectedProblemId,
                activeNodeId: state.activeNodeId,
                themes: state.themes,
                problems: state.problems,
                nodes: state.nodes,
                relations: state.relations,
            }),
            version: 2,
            migrate: (persistedState, version) => {
                if (version < 2 || !persistedState || typeof persistedState !== "object") {
                    return {
                        ...initialData,
                        isSidebarOpen: true,
                        isRightDrawerOpen: false,
                        selectedProblemId: initialData.problems[0]?.id ?? null,
                        activeNodeId: initialData.nodes[0]?.id ?? null,
                    };
                }
                return persistedState as SystemState;
            },
        }
    )
);
