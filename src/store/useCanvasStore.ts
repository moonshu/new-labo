import { create } from "zustand";

interface AISuggestion {
    themeId?: string;
    themeName?: string;
    problemId?: string;
    problemTitle?: string;
    status?: "DRAFT" | "HESITATED" | "CONCLUDED";
}

interface CanvasState {
    content: string;
    setContent: (content: string) => void;
    isFocused: boolean;
    setFocused: (focused: boolean) => void;
    isAnalyzing: boolean;
    setAnalyzing: (analyzing: boolean) => void;
    suggestions: AISuggestion | null;
    setSuggestions: (suggestions: AISuggestion | null) => void;
    clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
    content: "",
    setContent: (content) => set({ content }),
    isFocused: false,
    setFocused: (focused) => set({ isFocused: focused }),
    isAnalyzing: false,
    setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
    suggestions: null,
    setSuggestions: (suggestions) => set({ suggestions }),
    clearCanvas: () => set({ content: "", suggestions: null, isFocused: false }),
}));
