"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";
import { defaultSuggestion } from "@/lib/domain/thought-system";
import { Loader2, ArrowRightCircle, HelpCircle, Sparkles, Link2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ThoughtStatus } from "@/types/thought";

const STATUS_OPTIONS: ThoughtStatus[] = ["DRAFT", "HESITATED", "CONCLUDED"];
const STATUS_LABEL: Record<ThoughtStatus, string> = {
    DRAFT: "판단 유보",
    HESITATED: "망설임",
    CONCLUDED: "단정",
};

export default function Editor() {
    const {
        content,
        setContent,
        isFocused,
        setFocused,
        isAnalyzing,
        setAnalyzing,
        suggestion,
        setSuggestion,
        patchSuggestion,
        clearCanvas,
        contextualNudge,
        setContextualNudge,
    } = useCanvasStore();

    const {
        addThought,
        themes,
        problems,
        nodes,
        selectedProblemId,
        setSelectedProblem,
        getContextNudge,
    } = useSystemStore();

    const selectedProblem = selectedProblemId
        ? problems.find((problem) => problem.id === selectedProblemId) ?? null
        : null;

    const systemSnapshot = `${problems.length}-${themes.length}-${nodes.length}`;

    useEffect(() => {
        const trimmed = content.trim();
        if (!trimmed) {
            setContextualNudge(null);
            if (!isFocused) return;

            const timer = window.setTimeout(() => {
                setContextualNudge(getContextNudge(content));
            }, 60_000);

            return () => window.clearTimeout(timer);
        }

        setContextualNudge(getContextNudge(content));
    }, [content, getContextNudge, setContextualNudge, systemSnapshot, isFocused]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (suggestion) {
                handleSave();
            } else {
                handleAnalyze();
            }
        }
    };

    const handleAnalyze = async () => {
        if (!content.trim()) return;

        setAnalyzing(true);
        setFocused(false);

        try {
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    existingThemes: themes.map((theme) => theme.name),
                    activeProblems: problems
                        .filter((problem) => problem.status === "OPEN")
                        .map((problem) => problem.title),
                }),
            });

            if (!response.ok) throw new Error('Analysis failed');

            const result = await response.json();

            setSuggestion({
                problemTitle: result.problemTitle || "새 문제",
                themeName: result.themeName || "새 주제",
                status: result.status || "DRAFT",
            });
        } catch (error) {
            console.error("AI Analysis failed:", error);
            const fallback = defaultSuggestion(content);
            setSuggestion(fallback);
            toast.warning("AI 응답이 지연되어 임시 제안을 사용합니다.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = () => {
        if (!content.trim()) return;

        try {
            const finalSuggestion = suggestion ?? defaultSuggestion(content);
            const result = addThought(content, finalSuggestion);
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

    const handleIdk = () => {
        if (!content.trim()) return;
        const draftSuggestion = {
            status: "DRAFT",
            themeName: suggestion?.themeName || "사유",
            problemTitle: selectedProblem?.title || suggestion?.problemTitle || "지금의 고민은 무엇일까?",
        } as const;

        try {
            const result = addThought(content, draftSuggestion);
            clearCanvas();
            toast.success(`유보 노드 저장됨 · ${result.problem.title}`);
        } catch (error) {
            console.error("Draft save failed:", error);
            toast.error("유보 저장 중 오류가 발생했습니다.");
        }
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
                    onKeyDown={handleKeyDown}
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
                        onClick={handleAnalyze}
                        disabled={!content.trim() || isAnalyzing}
                        className="text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>분석</span>
                                <ArrowRightCircle className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {contextualNudge && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute left-0 right-0 -top-14"
                    >
                        <div className="mx-auto w-fit max-w-full px-3 py-1.5 rounded-full border border-border/60 bg-background/95 text-xs text-muted-foreground flex items-center gap-2">
                            <Link2 className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[32rem]">{contextualNudge.message}</span>
                            {contextualNudge.targetProblemId && (
                                <button
                                    type="button"
                                    className="text-primary hover:underline"
                                    onClick={() => setSelectedProblem(contextualNudge.targetProblemId!)}
                                >
                                    열기
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {suggestion && !isAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 top-full mt-4"
                    >
                        <div className="mx-auto w-[44rem] max-w-full rounded-xl border border-border/60 bg-card/95 shadow-lg p-3 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Sparkles className="w-3.5 h-3.5" />
                                AI 제안 (수정 후 저장 가능)
                            </div>

                            <div className="flex gap-1.5 flex-wrap">
                                {STATUS_OPTIONS.map((status) => (
                                    <Chip
                                        key={status}
                                        label={STATUS_LABEL[status]}
                                        variant={suggestion.status === status ? "primary" : "outline"}
                                        onClick={() => patchSuggestion({ status })}
                                    />
                                ))}
                            </div>

                            <div className="grid md:grid-cols-2 gap-2">
                                <Input
                                    value={suggestion.problemTitle}
                                    onChange={(event) => patchSuggestion({ problemTitle: event.target.value })}
                                    placeholder="연결할 질문"
                                />
                                <Input
                                    value={suggestion.themeName}
                                    onChange={(event) => patchSuggestion({ themeName: event.target.value })}
                                    placeholder="연결할 주제"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                    {selectedProblem ? `현재 선택 문제: ${selectedProblem.title}` : "문제를 선택하지 않으면 AI 제안 기준으로 저장됩니다."}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAnalyze}
                                        className="text-xs px-2.5 py-1.5 rounded-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                        다시 분석
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        className="text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        저장하기
                                    </button>
                                </div>
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
    onClick,
}: {
    label: string;
    variant: "primary" | "outline";
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "px-3 py-1 text-xs rounded-full border border-border/50 bg-card hover:bg-muted transition-colors text-muted-foreground cursor-pointer shadow-sm",
                variant === "primary" && "border-primary/20 text-primary bg-primary/5 hover:bg-primary/10"
            )}
        >
            {label}
        </button>
    );
}
