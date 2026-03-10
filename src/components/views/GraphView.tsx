"use client";

import { useMemo } from "react";
import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";
import { relationTypeLabel } from "@/lib/domain/thought-system";
import type { RelationType } from "@/types/thought";

const RELATION_STROKE: Record<RelationType, string> = {
  EXTENSION: "stroke-primary/70",
  REFUTATION: "stroke-destructive/70",
  PARALLEL: "stroke-muted-foreground/60",
  REVISION: "stroke-amber-500/70",
};

function polarPoint(index: number, total: number): { x: number; y: number } {
  const baseAngle = (Math.PI * 2 * index) / Math.max(1, total);
  const wobble = index % 2 === 0 ? 0 : 0.22;
  const radius = total <= 2 ? 110 : total <= 5 ? 150 : 190;
  const cx = 420;
  const cy = 230;
  return {
    x: cx + Math.cos(baseAngle + wobble) * radius,
    y: cy + Math.sin(baseAngle + wobble) * radius,
  };
}

export default function GraphView() {
  const {
    relations,
    activeNodeId,
    getCurrentNodes,
    setActiveNode,
    openRightDrawer,
  } = useSystemStore();
  const nodes = getCurrentNodes();

  const points = useMemo(() => {
    const pairs = nodes.map((node, index) => [node.id, polarPoint(index, nodes.length)] as const);
    return new Map(pairs);
  }, [nodes]);

  const visibleNodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const visibleRelations = useMemo(
    () =>
      relations.filter(
        (relation) =>
          visibleNodeIds.has(relation.sourceNodeId) && visibleNodeIds.has(relation.targetNodeId)
      ),
    [relations, visibleNodeIds]
  );

  if (!nodes.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-5 text-center">
        <p className="text-sm text-muted-foreground">그래프로 표시할 노드가 없습니다.</p>
        <p className="text-xs text-muted-foreground/80 mt-1">검색어나 상태 필터를 조정해보세요.</p>
      </div>
    );
  }

  return (
    <div className="surface-panel p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">노드를 클릭하면 상세 편집 패널이 열립니다.</p>
        <p className="text-xs text-muted-foreground">
          노드 {nodes.length}개 · 관계 {visibleRelations.length}개
        </p>
      </div>

      <div className="relative h-[480px] w-full overflow-auto rounded-xl border border-border/40 bg-background/70">
        <div className="relative mx-auto my-4 h-[460px] w-[840px]">
          <svg className="absolute inset-0 h-full w-full" aria-hidden>
            {visibleRelations.map((relation) => {
              const from = points.get(relation.sourceNodeId);
              const to = points.get(relation.targetNodeId);
              if (!from || !to) return null;
              const labelX = (from.x + to.x) / 2;
              const labelY = (from.y + to.y) / 2;

              return (
                <g key={relation.id}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={cn("stroke-[1.8]", RELATION_STROKE[relation.relationType])}
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {relationTypeLabel(relation.relationType)}
                  </text>
                </g>
              );
            })}
          </svg>

          {nodes.map((node) => {
            const point = points.get(node.id);
            if (!point) return null;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  setActiveNode(node.id);
                  openRightDrawer();
                }}
                className={cn(
                  "touch-target absolute w-44 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 text-left shadow-sm transition-colors",
                  activeNodeId === node.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 bg-card/90 hover:bg-muted/50"
                )}
                style={{ left: `${point.x}px`, top: `${point.y}px` }}
              >
                <p className="text-[11px] text-muted-foreground mb-1">{node.status}</p>
                <p className="text-xs text-foreground/90 line-clamp-2">{node.content}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {node.tags.slice(0, 2).map((tag) => (
                    <span
                      key={`${node.id}-${tag}`}
                      className="rounded-full border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
