"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { daysSince, formatKoreanDate, isProblemStale } from "@/lib/domain/thought-system";
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

    if (!nodes.length) {
        return null;
    }

    return (
        <div className={cn(
            "flex-1 w-full max-w-2xl mx-auto flex flex-col justify-end gap-12 pb-16 transition-opacity",
            isFocused && "opacity-40"
        )}>
            <div className="flex justify-center mb-8">
                <div className="text-center">
                    <h2 className="text-xl font-medium tracking-tight bg-muted/50 px-4 py-2 rounded-lg text-muted-foreground w-fit">
                        {selectedProblem?.title ?? "최근 사유 흐름"}
                    </h2>
                    {selectedProblem && (
                        <p className={cn(
                            "text-xs mt-2",
                            isProblemStale(selectedProblem) ? "text-destructive" : "text-muted-foreground"
                        )}>
                            마지막 업데이트 {daysSince(selectedProblem.lastThoughtAt)}일 전
                        </p>
                    )}
                </div>
            </div>

            <div className="relative border-l-2 border-border/50 pl-6 flex flex-col gap-10">
                {nodes.map((node) => (
                    <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                            setActiveNode(node.id);
                            openRightDrawer();
                        }}
                        className="relative group text-left"
                    >
                        {/* Timeline dot */}
                        <div className={cn(
                            "absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-[3px] border-background",
                            node.status === "CONCLUDED" ? "bg-primary" : node.status === "HESITATED" ? "bg-amber-500" : "bg-muted-foreground",
                            activeNodeId === node.id && "ring-2 ring-primary/35"
                        )} />

                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-semibold text-muted-foreground tracking-wider">
                                {STATUS_LABEL[node.status]}
                            </span>
                            <span className="text-xs text-muted-foreground opacity-60">
                                {formatKoreanDate(node.createdAt)}
                            </span>
                        </div>
                        <p className={cn(
                            "text-base leading-relaxed font-serif whitespace-pre-wrap transition-colors",
                            activeNodeId === node.id ? "text-foreground" : "text-foreground/85 group-hover:text-foreground/95"
                        )}>
                            {node.content}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}
