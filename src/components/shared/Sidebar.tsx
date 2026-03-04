"use client";

import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { daysSince, isProblemStale } from "@/lib/domain/thought-system";
import { Menu, Book, ListTree, Activity, Moon, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ProblemStatus } from "@/types/thought";
import ThoughtStreak from "@/components/shared/ThoughtStreak";

const STATUS_SEQUENCE: ProblemStatus[] = ["OPEN", "PENDING", "RESOLVED"];

const STATUS_LABEL: Record<ProblemStatus, string> = {
  OPEN: "열림",
  PENDING: "보류",
  RESOLVED: "종결",
  MERGED: "병합",
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useCanvasStore((state) => state.isFocused);

  const {
    isSidebarOpen,
    toggleSidebar,
    themes,
    problems,
    nodes,
    selectedProblemId,
    setSelectedProblem,
    setProblemStatus,
  } = useSystemStore();

  const problemsSorted = [...problems].sort(
    (left, right) =>
      new Date(right.lastThoughtAt).getTime() - new Date(left.lastThoughtAt).getTime()
  );

  const themeUsage = themes.map((theme) => ({
    ...theme,
    count: nodes.filter((node) => node.themeId === theme.id).length,
  }));

  const moveStatus = (problemId: string, status: ProblemStatus) => {
    const currentIndex = STATUS_SEQUENCE.indexOf(status === "MERGED" ? "OPEN" : status);
    const nextStatus = STATUS_SEQUENCE[(currentIndex + 1) % STATUS_SEQUENCE.length];
    setProblemStatus(problemId, nextStatus);
  };

  return (
    <>
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-md border border-border/70 bg-card/90 text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {isSidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="md:hidden fixed inset-0 bg-black/45 z-30"
          aria-label="Close sidebar backdrop"
        />
      )}

      <aside
        className={cn(
          "fixed md:relative left-0 top-0 h-screen bg-card/95 border-r border-border flex flex-col transition-all duration-300 z-40 md:z-20",
          isFocused && "opacity-40",
          isSidebarOpen
            ? "translate-x-0 w-72 md:w-64"
            : "-translate-x-full md:translate-x-0 w-72 md:w-16 md:items-center"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && <span className="font-semibold text-lg tracking-tight">Thought Map</span>}
          <button
            onClick={toggleSidebar}
            className="p-2 -mr-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto mt-4 px-2 flex flex-col gap-2">
          <SidebarItem
            icon={<Book className="w-4 h-4" />}
            label="전체 노트 (Canvas)"
            isOpen={isSidebarOpen}
            active={!selectedProblemId && pathname === "/"}
            onClick={() => {
              setSelectedProblem(null);
              router.push("/");
            }}
          />

          {isSidebarOpen && (
            <div className="px-2 pt-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2">
                <ListTree className="w-3.5 h-3.5" />
                나의 주제
              </div>
              <div className="space-y-1">
                {themeUsage.map((theme) => (
                  <div
                    key={theme.id}
                    className="rounded-md bg-muted/20 border border-border/50 px-2 py-1.5 text-xs text-muted-foreground flex items-center justify-between"
                  >
                    <span className="truncate">{theme.name}</span>
                    <span className="opacity-70">{theme.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSidebarOpen && (
            <div className="px-2 pt-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2">
                <Activity className="w-3.5 h-3.5" />
                열린 문제
              </div>
              <div className="space-y-1.5">
                {problemsSorted.map((problem) => {
                  const stale = isProblemStale(problem);
                  const selected = selectedProblemId === problem.id;
                  return (
                    <button
                      key={problem.id}
                      type="button"
                      onClick={() => {
                        setSelectedProblem(problem.id);
                        router.push(`/problem/${problem.id}`);
                      }}
                      className={cn(
                        "w-full text-left rounded-lg border px-2 py-2 transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/50 hover:bg-muted/50",
                        stale && "border-destructive/40"
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <ChevronRight
                          className={cn(
                            "w-3.5 h-3.5 mt-0.5",
                            selected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-xs leading-snug line-clamp-2",
                              stale ? "text-destructive/90" : "text-foreground/90"
                            )}
                          >
                            {problem.title}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveStatus(problem.id, problem.status);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              {STATUS_LABEL[problem.status]}
                            </button>
                            <span className="text-[10px] text-muted-foreground/80">
                              {stale ? `${daysSince(problem.lastThoughtAt)}일 방치` : "활성"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-border flex flex-col gap-4">
          {isSidebarOpen ? (
            <>
              <ThoughtStreak />
              <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                <Moon className="w-4 h-4" /> <span>조용한 흐름으로 기록 중</span>
              </div>
            </>
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground mt-2" />
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarItem({
  icon,
  label,
  isOpen,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors whitespace-nowrap overflow-hidden",
        active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground",
        isOpen ? "justify-start px-3" : "justify-center"
      )}
    >
      {icon}
      {isOpen && <span className="text-sm">{label}</span>}
    </button>
  );
}
