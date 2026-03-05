"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Editor from "@/components/canvas/Editor";
import Timeline from "@/components/views/Timeline";
import RightDrawer from "@/components/shared/RightDrawer";
import { useSystemStore } from "@/store/useSystemStore";
import { formatKoreanDate } from "@/lib/domain/thought-system";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { ThoughtStatus } from "@/types/thought";

type DashboardWorkspaceProps = {
  focusProblemId?: string;
};

type TimelineFilter = ThoughtStatus | "ALL" | "WARNING" | "AI_ONLY";

function dayKey(input: string): string {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const STATUS_FILTER_OPTIONS: TimelineFilter[] = [
  "ALL",
  "DRAFT",
  "HESITATED",
  "CONCLUDED",
  "WARNING",
  "AI_ONLY",
];

const STATUS_FILTER_LABEL: Record<TimelineFilter, string> = {
  ALL: "전체 상태",
  DRAFT: "질문",
  HESITATED: "유보",
  CONCLUDED: "정리",
  WARNING: "근거 경고",
  AI_ONLY: "AI 생성",
};

export default function DashboardWorkspace({ focusProblemId }: DashboardWorkspaceProps) {
  const router = useRouter();
  const {
    problems,
    themes,
    nodes,
    selectedProblemId,
    setSelectedProblem,
    timelineQuery,
    timelineStatusFilter,
    setTimelineQuery,
    setTimelineStatusFilter,
    getCurrentNodes,
    getQualityMetrics,
    toggleRightDrawer,
  } = useSystemStore();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
  const qualityMetrics = getQualityMetrics();

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
  const flowSteps = useMemo(
    () => [
      { label: "기록", done: stats.todayCount > 0 },
      { label: "분석", done: qualityMetrics.aiGeneratedCount > 0 },
      { label: "검증", done: qualityMetrics.warningCount === 0 },
      { label: "정리", done: qualityMetrics.concludedCount > 0 },
    ],
    [stats.todayCount, qualityMetrics.aiGeneratedCount, qualityMetrics.warningCount, qualityMetrics.concludedCount]
  );

  return (
    <div className="flex-1 w-full h-full flex flex-row relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(33,150,243,0.14),transparent_45%),radial-gradient(circle_at_85%_4%,rgba(255,152,0,0.12),transparent_38%),radial-gradient(circle_at_62%_92%,rgba(46,125,50,0.12),transparent_45%)]" />
        <div className="ambient-blob absolute top-[8%] left-[9%] w-72 h-72 rounded-full blur-3xl bg-primary/20" />
        <div className="ambient-blob absolute bottom-[6%] right-[10%] w-80 h-80 rounded-full blur-3xl bg-destructive/10 [animation-delay:2s]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative h-full">
        <header className="w-full max-w-3xl mb-4 z-10">
          <div className="surface-panel soft-scroll px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground mb-2 overflow-x-auto">
            <Metric label="오늘 기록" value={`${stats.todayCount}`} />
            <Metric label="열린 문제" value={`${stats.openProblems}`} />
            <Metric label="주제" value={`${stats.totalThemes}`} />
            <Metric label="노드" value={`${stats.totalNodes}`} />
            <Metric label="현재 표시" value={`${visibleNodeCount}`} />
            {selectedProblem && (
              <span className="ml-auto truncate max-w-[26rem] text-foreground/85 max-md:basis-full max-md:ml-0 max-md:text-[11px]">
                선택 문제 · {selectedProblem.title}
              </span>
            )}
          </div>

          <div className="surface-panel soft-scroll px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground mb-2 overflow-x-auto">
            <span className="uppercase tracking-wider text-[11px] text-muted-foreground/80">Flow</span>
            {flowSteps.map((step, index) => (
              <div key={step.label} className="inline-flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-xs whitespace-nowrap",
                    step.done
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                      : "border-border/60 bg-muted/35 text-muted-foreground"
                  )}
                >
                  {step.done ? "완료" : "대기"} · {step.label}
                </span>
                {index < flowSteps.length - 1 && <span className="text-muted-foreground/50">→</span>}
              </div>
            ))}
          </div>

          <div className="surface-panel soft-scroll px-3 py-2 flex md:grid md:grid-cols-5 gap-2 mb-2 overflow-x-auto">
            <QualityMetric
              label="Evidence"
              value={qualityMetrics.evidenceCoverage}
              threshold={0.9}
              higherIsBetter
            />
            <QualityMetric
              label="Hallucination"
              value={qualityMetrics.hallucinationProxy}
              threshold={0.05}
              higherIsBetter={false}
            />
            <QualityMetric
              label="Override"
              value={qualityMetrics.overrideRate}
              threshold={0.15}
              higherIsBetter
            />
            <QualityMetric
              label="Reflection"
              value={qualityMetrics.reflectionCompletionRate}
              threshold={0.6}
              higherIsBetter
            />
            <AlertMetric
              label="Warnings"
              value={qualityMetrics.warningCount}
              hint={`${qualityMetrics.concludedCount} concluded`}
            />
          </div>

          <div className="surface-panel px-3 py-2 flex flex-col md:flex-row gap-2 items-center">
            <Input
              ref={searchInputRef}
              value={timelineQuery}
              onChange={(event) => setTimelineQuery(event.target.value)}
              placeholder="타임라인 검색 (내용/상태/근거)"
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
            단축키: <kbd className="ui-kbd">/</kbd> 검색,{" "}
            <kbd className="ui-kbd">⌘/Ctrl + K</kbd> 관계 패널
          </p>
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
    <div className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 whitespace-nowrap shrink-0">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function QualityMetric({
  label,
  value,
  threshold,
  higherIsBetter,
}: {
  label: string;
  value: number;
  threshold: number;
  higherIsBetter: boolean;
}) {
  const meetsThreshold = higherIsBetter ? value >= threshold : value <= threshold;
  const pct = `${Math.round(value * 100)}%`;

  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 text-xs min-w-[8rem] md:min-w-0 shrink-0",
        meetsThreshold ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
      )}
    >
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground font-medium">{pct}</p>
      <p className="text-[10px] text-muted-foreground/80">
        기준 {Math.round(threshold * 100)}% {higherIsBetter ? "이상" : "이하"}
      </p>
    </div>
  );
}

function AlertMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 text-xs min-w-[8rem] md:min-w-0 shrink-0",
        value === 0 ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
      )}
    >
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground font-medium">{value}</p>
      <p className="text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}
