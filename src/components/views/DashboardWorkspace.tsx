"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Editor from "@/components/canvas/Editor";
import Timeline from "@/components/views/Timeline";
import GraphView from "@/components/views/GraphView";
import RightDrawer from "@/components/shared/RightDrawer";
import { useSystemStore } from "@/store/useSystemStore";
import { formatKoreanDate } from "@/lib/domain/thought-system";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { ThoughtStatus } from "@/types/thought";

type DashboardWorkspaceProps = {
  focusProblemId?: string;
};

type TimelineFilter = ThoughtStatus | "ALL";
type WorkspaceView = "TIMELINE" | "GRAPH";

const STATUS_FILTER_OPTIONS: TimelineFilter[] = ["ALL", "DRAFT", "HESITATED", "CONCLUDED"];

const STATUS_FILTER_LABEL: Record<TimelineFilter, string> = {
  ALL: "전체 상태",
  DRAFT: "질문",
  HESITATED: "유보",
  CONCLUDED: "정리",
};

export default function DashboardWorkspace({ focusProblemId }: DashboardWorkspaceProps) {
  const router = useRouter();
  const {
    problems,
    nodes,
    selectedProblemId,
    setSelectedProblem,
    timelineQuery,
    timelineStatusFilter,
    setTimelineQuery,
    setTimelineStatusFilter,
    getCurrentNodes,
    toggleRightDrawer,
  } = useSystemStore();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("TIMELINE");

  useEffect(() => {
    if (!focusProblemId) return;
    const exists = problems.some((problem) => problem.id === focusProblemId);
    if (!exists) {
      setSelectedProblem(null);
      router.replace("/");
      return;
    }
    setSelectedProblem(focusProblemId);
  }, [focusProblemId, setSelectedProblem, problems, router]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleRightDrawer();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleRightDrawer]);

  const selectedProblem = problems.find((problem) => problem.id === selectedProblemId) ?? null;
  const visibleNodeCount = getCurrentNodes().length;

  return (
    <div className="flex-1 w-full h-full min-h-0 flex flex-row relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(33,150,243,0.14),transparent_45%),radial-gradient(circle_at_85%_4%,rgba(255,152,0,0.12),transparent_38%),radial-gradient(circle_at_62%_92%,rgba(46,125,50,0.12),transparent_45%)]" />
        <div className="ambient-blob absolute top-[8%] left-[9%] w-72 h-72 rounded-full blur-3xl bg-primary/20" />
        <div className="ambient-blob absolute bottom-[6%] right-[10%] w-80 h-80 rounded-full blur-3xl bg-destructive/10 [animation-delay:2s]" />
      </div>

      <div className="soft-scroll flex-1 min-h-0 flex flex-col items-center p-4 md:p-8 relative h-full overflow-y-auto">
        <header className="w-full max-w-3xl mb-4 z-10 shrink-0">
          <div className="surface-panel px-3 py-2 text-xs text-muted-foreground mb-2 flex items-center justify-between gap-3">
            <span className="truncate">
              {selectedProblem ? `선택 주제 묶음 · ${selectedProblem.title}` : "전체 노트를 보고 있습니다."}
            </span>
            <span className="shrink-0">표시 노드 {visibleNodeCount}개</span>
          </div>
          <p className="px-1 mb-2 text-[11px] text-muted-foreground">
            `주제 묶음`은 좌측에서 고르는 기록 폴더이고, `AI 질문`은 글에서 자동 추출되는 핵심 질문입니다.
          </p>

          <div className="surface-panel px-3 py-2 flex flex-col md:flex-row gap-2 items-center">
            <Input
              ref={searchInputRef}
              value={timelineQuery}
              onChange={(event) => setTimelineQuery(event.target.value)}
              placeholder="검색 (내용/상태/태그/근거)"
              className="h-10 md:h-8"
            />
            <select
              value={timelineStatusFilter}
              onChange={(event) => setTimelineStatusFilter(event.target.value as TimelineFilter)}
              className="h-10 md:h-8 w-full md:w-40 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground touch-manipulation"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {STATUS_FILTER_LABEL[option]}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 md:flex gap-1 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setWorkspaceView("TIMELINE")}
                className={cn(
                  "touch-target h-10 md:h-8 px-3 rounded-md border text-xs w-full md:w-auto",
                  workspaceView === "TIMELINE"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                타임라인
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceView("GRAPH")}
                className={cn(
                  "touch-target h-10 md:h-8 px-3 rounded-md border text-xs w-full md:w-auto",
                  workspaceView === "GRAPH"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                노드 그래프
              </button>
            </div>
            {(timelineQuery || timelineStatusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setTimelineQuery("");
                  setTimelineStatusFilter("ALL");
                }}
                className="touch-target h-10 md:h-8 px-3 rounded-md border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                필터 초기화
              </button>
            )}
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground/80 px-1 hidden md:block">
            단축키: <kbd className="ui-kbd">/</kbd> 검색, <kbd className="ui-kbd">⌘/Ctrl + K</kbd> 상세 패널
          </p>
        </header>

        <div className="max-w-3xl w-full flex flex-col gap-4 pb-10 md:pb-14 relative z-10 transition-all duration-300">
          <Editor />
          {workspaceView === "TIMELINE" ? <Timeline /> : <GraphView />}

          <div className={cn("pt-4 text-center text-xs text-muted-foreground/70", nodes.length ? "opacity-100" : "opacity-0")}>
            마지막 기록: {nodes[0] ? formatKoreanDate(nodes[0].createdAt) : "-"}
          </div>
        </div>
      </div>

      <RightDrawer />
    </div>
  );
}
