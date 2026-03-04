"use client";

import { useEffect, useMemo } from "react";
import Editor from "@/components/canvas/Editor";
import Timeline from "@/components/views/Timeline";
import RightDrawer from "@/components/shared/RightDrawer";
import { useSystemStore } from "@/store/useSystemStore";
import { formatKoreanDate } from "@/lib/domain/thought-system";
import { cn } from "@/lib/utils";

type DashboardWorkspaceProps = {
  focusProblemId?: string;
};

function dayKey(input: string): string {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardWorkspace({ focusProblemId }: DashboardWorkspaceProps) {
  const {
    problems,
    themes,
    nodes,
    selectedProblemId,
    setSelectedProblem,
  } = useSystemStore();

  useEffect(() => {
    if (focusProblemId) {
      setSelectedProblem(focusProblemId);
    }
  }, [focusProblemId, setSelectedProblem]);

  const selectedProblem = problems.find((problem) => problem.id === selectedProblemId) ?? null;

  const stats = useMemo(() => {
    const openProblems = problems.filter((problem) => problem.status === "OPEN").length;
    const today = dayKey(new Date().toISOString());
    const todayCount = nodes.filter((node) => dayKey(node.createdAt) === today).length;

    return {
      openProblems,
      totalNodes: nodes.length,
      totalThemes: themes.length,
      todayCount,
    };
  }, [problems, nodes, themes]);

  return (
    <div className="flex-1 w-full h-full flex flex-row relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(33,150,243,0.14),transparent_45%),radial-gradient(circle_at_85%_4%,rgba(255,152,0,0.12),transparent_38%),radial-gradient(circle_at_62%_92%,rgba(46,125,50,0.12),transparent_45%)]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative h-full">
        <header className="w-full max-w-3xl mb-4 z-10">
          <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Metric label="오늘 기록" value={`${stats.todayCount}`} />
            <Metric label="열린 문제" value={`${stats.openProblems}`} />
            <Metric label="주제" value={`${stats.totalThemes}`} />
            <Metric label="노드" value={`${stats.totalNodes}`} />
            {selectedProblem && (
              <span className="ml-auto truncate max-w-[26rem] text-foreground/85">
                선택 문제 · {selectedProblem.title}
              </span>
            )}
          </div>
        </header>

        <div className="max-w-3xl w-full flex-1 flex flex-col justify-end pb-[14vh] md:pb-[18vh] relative z-10 transition-all duration-300">
          <Timeline />
          <Editor />

          <div className={cn(
            "pt-4 text-center text-xs text-muted-foreground/70",
            nodes.length ? "opacity-100" : "opacity-0"
          )}>
            마지막 기록: {nodes[0] ? formatKoreanDate(nodes[0].createdAt) : "-"}
          </div>
        </div>
      </div>

      <RightDrawer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
