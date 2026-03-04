import { create } from "zustand";
import type { AISuggestion, ContextNudge } from "@/types/thought";

interface CanvasState {
    content: string;
    setContent: (content: string) => void;
    isFocused: boolean;
    setFocused: (focused: boolean) => void;
    isAnalyzing: boolean;
    setAnalyzing: (analyzing: boolean) => void;
    suggestion: AISuggestion | null;
    setSuggestion: (suggestion: AISuggestion | null) => void;
    patchSuggestion: (patch: Partial<AISuggestion>) => void;
    contextualNudge: ContextNudge | null;
    setContextualNudge: (nudge: ContextNudge | null) => void;
    clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
    content: "",
    setContent: (content) => set({ content }),
    isFocused: false,
    setFocused: (focused) => set({ isFocused: focused }),
    isAnalyzing: false,
    setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
    suggestion: null,
    setSuggestion: (suggestion) => set({ suggestion }),
    patchSuggestion: (patch) =>
        set((state) =>
            state.suggestion
                ? { suggestion: { ...state.suggestion, ...patch } }
                : { suggestion: null }
        ),
    contextualNudge: null,
    setContextualNudge: (contextualNudge) => set({ contextualNudge }),
    clearCanvas: () => set({ content: "", suggestion: null, contextualNudge: null, isFocused: false }),
}));
