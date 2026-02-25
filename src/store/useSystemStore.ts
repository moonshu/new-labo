import { create } from "zustand";

interface SystemState {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    isLocked: boolean;
    targetProblem: any | null; // 나중에 구체적인 타입으로
    setLock: (locked: boolean, targetProblem?: any) => void;
    isRightDrawerOpen: boolean;
    toggleRightDrawer: () => void;
}

export const useSystemStore = create<SystemState>((set) => ({
    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    // 강제 회고 잠금 상태
    isLocked: false,
    targetProblem: null,
    setLock: (locked, targetProblem) => set({ isLocked: locked, targetProblem }),

    isRightDrawerOpen: false,
    toggleRightDrawer: () => set((state) => ({ isRightDrawerOpen: !state.isRightDrawerOpen })),
}));
