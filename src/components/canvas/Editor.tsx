"use client";

import { useCanvasStore } from "@/store/useCanvasStore";
import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";
import { Loader2, ArrowRightCircle, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Editor() {
    const {
        content,
        setContent,
        isFocused,
        setFocused,
        isAnalyzing,
        setAnalyzing,
        suggestions,
        setSuggestions,
        clearCanvas,
    } = useCanvasStore();

    const { isSidebarOpen } = useSystemStore();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // CMD/CTRL + Enter로 저장 및 분석 시작
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!content.trim()) return;

        setAnalyzing(true);
        setFocused(false);

        try {
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    existingThemes: [], // 향후 실제 데이터 주입
                    activeProblems: [], // 향후 실제 데이터 주입
                }),
            });

            if (!response.ok) throw new Error('Analysis failed');

            const result = await response.json();

            setSuggestions({
                problemTitle: result.problemTitle || "새 문제",
                themeName: result.themeName || "새 주제",
                status: result.status || "DRAFT",
            });
        } catch (error) {
            console.error("AI Analysis failed:", error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleIdk = () => {
        // 의도적 파편화 로직
        clearCanvas();
        // 토스트 띄우기 (마이그레이션 필요)
    };

    return (
        <div
            className={cn(
                "relative w-[40rem] max-w-full mx-auto transition-all duration-500",
                isFocused ? "opacity-100 scale-100 z-50" : "opacity-90 scale-95"
            )}
        >
            <div className="relative group bg-card border border-border rounded-xl shadow-lg ring-1 ring-primary/5 focus-within:ring-primary/20 transition-all p-1">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="지금 맴도는 생각은 무엇인가요?"
                    disabled={isAnalyzing}
                    className="w-full min-h-[120px] bg-transparent resize-none p-4 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
                    style={{ height: Math.max(120, content.split('\n').length * 28 + 40) + 'px' }}
                />

                {/* 액션 버튼 */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
                    <button
                        onClick={handleIdk}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors px-2 py-1 rounded-md hover:bg-muted"
                    >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>아직 모르겠음</span>
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || isAnalyzing}
                        className="text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>던지기</span>
                                <ArrowRightCircle className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* AI 조심스러운 제안 (Chips) */}
            <AnimatePresence>
                {suggestions && !isAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 top-full mt-4 flex gap-2 justify-center flex-wrap"
                    >
                        <Chip label={suggestions.problemTitle || "새 문제"} variant="primary" />
                        <Chip label={suggestions.themeName || "새 주제"} variant="outline" />
                        <Chip label={suggestions.status === "DRAFT" ? "판단 유보" : "단정"} variant="outline" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Chip({ label, variant }: { label: string; variant: "primary" | "outline" }) {
    return (
        <button
            className={cn(
                "px-3 py-1 text-xs rounded-full border border-border/50 bg-card hover:bg-muted transition-colors text-muted-foreground cursor-pointer shadow-sm",
                variant === "primary" && "border-primary/20 text-primary bg-primary/5 hover:bg-primary/10"
            )}
        >
            {label}
        </button>
    );
}
