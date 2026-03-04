"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { formatKoreanDate, relationTypeLabel } from "@/lib/domain/thought-system";
import { X, Link2, CircleDot, ArrowRight } from "lucide-react";

export default function RightDrawer() {
    const {
        isRightDrawerOpen,
        toggleRightDrawer,
        activeNodeId,
        nodes,
        themes,
        problems,
        relations,
        setActiveNode,
    } = useSystemStore();
    const isFocused = useCanvasStore((state) => state.isFocused);

    const activeNode = nodes.find((node) => node.id === activeNodeId) ?? null;
    const activeTheme = activeNode
        ? themes.find((theme) => theme.id === activeNode.themeId) ?? null
        : null;
    const activeProblem = activeNode
        ? problems.find((problem) => problem.id === activeNode.problemId) ?? null
        : null;

    const connectedRelations = activeNode
        ? relations.filter(
            (relation) =>
                relation.sourceNodeId === activeNode.id || relation.targetNodeId === activeNode.id
        )
        : [];

    const linkedNodes = connectedRelations
        .map((relation) => {
            const targetId =
                relation.sourceNodeId === activeNode?.id
                    ? relation.targetNodeId
                    : relation.sourceNodeId;
            const target = nodes.find((node) => node.id === targetId);
            return target ? { relation, target } : null;
        })
        .filter((entry): entry is { relation: typeof connectedRelations[number]; target: typeof nodes[number] } => Boolean(entry));

    return (
        <aside
            className={cn(
                "fixed right-0 top-0 h-screen bg-card border-l border-border transform transition-all duration-300 z-30 flex flex-col w-80",
                isFocused && "opacity-30",
                isRightDrawerOpen ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-sm text-foreground">관계성 (The Graph)</h3>
                <button
                    onClick={toggleRightDrawer}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {!activeNode && (
                    <p className="text-sm text-muted-foreground text-center mt-10 leading-relaxed">
                        타임라인에서 노드를 선택하면<br />
                        관계성과 메타데이터를 확인할 수 있습니다.
                    </p>
                )}

                {activeNode && (
                    <>
                        <section className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">현재 노드</h4>
                            <p className="text-sm text-foreground/90 leading-relaxed font-serif whitespace-pre-wrap">
                                {activeNode.content}
                            </p>
                            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                                <span>주제: {activeTheme?.name ?? "-"}</span>
                                <span>상태: {activeNode.status}</span>
                                <span className="col-span-2">날짜: {formatKoreanDate(activeNode.createdAt)}</span>
                            </div>
                            {activeProblem && (
                                <div className="pt-2 border-t border-border/40">
                                    <p className="text-[11px] text-muted-foreground">연결 문제</p>
                                    <p className="text-sm text-foreground/90">{activeProblem.title}</p>
                                </div>
                            )}
                        </section>

                        <section className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                                <Link2 className="w-3.5 h-3.5" />
                                관계성
                            </div>
                            {!linkedNodes.length && (
                                <div className="rounded-lg border border-border/50 p-3 text-xs text-muted-foreground">
                                    아직 자동 추론된 관계가 없습니다.
                                </div>
                            )}
                            {linkedNodes.map(({ relation, target }) => (
                                <button
                                    key={relation.id}
                                    type="button"
                                    onClick={() => setActiveNode(target.id)}
                                    className="w-full rounded-lg border border-border/50 hover:bg-muted/40 transition-colors p-3 text-left"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[11px] text-muted-foreground">
                                            {relationTypeLabel(relation.relationType)}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            유사도 {(relation.score * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/85 line-clamp-2">{target.content}</p>
                                    <div className="mt-2 text-xs text-primary inline-flex items-center gap-1">
                                        노드로 이동
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                </button>
                            ))}
                        </section>

                        <section className="rounded-lg border border-border/40 p-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                <CircleDot className="w-3.5 h-3.5" />
                                문제 상태
                            </div>
                            <p className="text-sm text-foreground/90">
                                {activeProblem ? `${activeProblem.status} · 마지막 생각 ${formatKoreanDate(activeProblem.lastThoughtAt)}` : "-"}
                            </p>
                        </section>
                    </>
                )}
            </div>
        </aside>
    );
}
