"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { daysSince, formatKoreanDate, isProblemStale } from "@/lib/domain/thought-system";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { ThoughtStatus } from "@/types/thought";

const STATUS_LABEL: Record<ThoughtStatus, string> = {
    DRAFT: "질문",
    HESITATED: "유보",
    CONCLUDED: "정리",
};

export default function Timeline() {
    const {
        problems,
        selectedProblemId,
        getCurrentNodes,
        setActiveNode,
        openRightDrawer,
        activeNodeId,
    } = useSystemStore();
    const isFocused = useCanvasStore((state) => state.isFocused);

    const selectedProblem = problems.find((problem) => problem.id === selectedProblemId) ?? null;
    const nodes = getCurrentNodes();

    return (
        <div className={cn(
            "flex-1 w-full max-w-2xl mx-auto flex flex-col justify-end gap-7 sm:gap-12 pb-10 sm:pb-16 transition-opacity",
            isFocused && "opacity-40"
        )}>
            <div className="flex justify-center mb-4 sm:mb-8">
                <div className="text-center">
                    <h2 className="text-base sm:text-xl font-semibold tracking-tight surface-panel px-3 sm:px-4 py-1.5 sm:py-2 text-foreground/90 w-fit max-w-full font-serif">
                        {selectedProblem?.title ?? "최근 사유 흐름"}
                    </h2>
                    {selectedProblem && (
                        <p className={cn(
                            "text-[11px] sm:text-xs mt-1.5 sm:mt-2",
                            isProblemStale(selectedProblem) ? "text-destructive" : "text-muted-foreground"
                        )}>
                            마지막 업데이트 {daysSince(selectedProblem.lastThoughtAt)}일 전
                        </p>
                    )}
                </div>
            </div>

            {nodes.length ? (
                <div className="relative border-l border-border/50 pl-4 sm:pl-6 flex flex-col gap-5 sm:gap-10">
                    {nodes.map((node, index) => (
                        <motion.button
                            key={node.id}
                            type="button"
                            onClick={() => {
                                setActiveNode(node.id);
                                openRightDrawer();
                            }}
                            className="relative group text-left rounded-xl p-2.5 sm:p-2 -ml-2 hover:bg-muted/25 transition-colors active:scale-[0.99] touch-manipulation"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.2) }}
                        >
                            <div className={cn(
                                "absolute -left-[18px] sm:-left-[31px] top-2 sm:top-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 sm:border-[3px] border-background",
                                node.status === "CONCLUDED" ? "bg-primary" : node.status === "HESITATED" ? "bg-amber-500" : "bg-muted-foreground",
                                activeNodeId === node.id && "ring-2 ring-primary/35"
                            )} />

                            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 mb-1.5">
                                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground tracking-wider inline-flex items-center gap-1">
                                    {STATUS_LABEL[node.status]}
                                    {node.hasEvidenceWarning && (
                                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-amber-600">
                                            <AlertTriangle className="w-3 h-3" />
                                            근거 부족
                                        </span>
                                    )}
                                </span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground opacity-60">
                                    {formatKoreanDate(node.createdAt)}
                                </span>
                            </div>
                            <p className={cn(
                                "text-[15px] sm:text-base leading-6 sm:leading-8 font-serif whitespace-pre-wrap tracking-[0.003em] sm:tracking-[0.005em] transition-colors",
                                activeNodeId === node.id ? "text-foreground" : "text-foreground/85 group-hover:text-foreground/95"
                            )}>
                                {node.content}
                            </p>
                        </motion.button>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-4 sm:p-6 text-center">
                    <p className="text-sm text-muted-foreground">현재 필터 조건에 맞는 노드가 없습니다.</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1">검색어나 상태 필터를 조정해보세요.</p>
                </div>
            )}
        </div>
    );
}
