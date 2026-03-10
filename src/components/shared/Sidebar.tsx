"use client";

import { useState } from "react";
import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { daysSince } from "@/lib/domain/thought-system";
import { Menu, Book, Activity, ChevronRight, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import ThoughtStreak from "@/components/shared/ThoughtStreak";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useCanvasStore((state) => state.isFocused);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");

  const {
    isSidebarOpen,
    toggleSidebar,
    problems,
    selectedProblemId,
    setSelectedProblem,
    createProblem,
  } = useSystemStore();

  const problemsSorted = [...problems].sort(
    (left, right) =>
      new Date(right.lastThoughtAt).getTime() - new Date(left.lastThoughtAt).getTime()
  );

  const handleCreateProblem = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("주제 묶음 제목을 입력해주세요.");
      return;
    }
    const created = createProblem(trimmed);
    router.push(`/problem/${created.id}`);
    setCreateDialogOpen(false);
    setCreateTitle("");
    toast.success("새 주제 묶음을 추가했습니다.");
  };

  return (
    <>
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="touch-target-icon md:hidden fixed top-4 left-4 z-40 rounded-md border border-border/70 bg-card/90 text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
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
          "fixed md:relative left-0 top-0 h-screen bg-card/90 backdrop-blur-2xl border-r border-border flex flex-col transition-all duration-300 z-40 md:z-20",
          isFocused && "opacity-40",
          isSidebarOpen
            ? "translate-x-0 w-72 md:w-64"
            : "-translate-x-full md:translate-x-0 w-72 md:w-16 md:items-center"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && <span className="font-semibold text-lg tracking-tight text-foreground/95">Thought Map</span>}
          <button
            onClick={toggleSidebar}
            className="touch-target-icon -mr-2 rounded-md hover:bg-muted text-muted-foreground transition-colors inline-flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="soft-scroll flex-1 overflow-y-auto mt-4 px-2 flex flex-col gap-2">
          <SidebarItem
            icon={<Book className="w-4 h-4" />}
            label="전체 노트"
            isOpen={isSidebarOpen}
            active={!selectedProblemId && pathname === "/"}
            onClick={() => {
              setSelectedProblem(null);
              router.push("/");
            }}
          />

          {isSidebarOpen && (
            <div className="px-2 pt-4">
              <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2">
                <span className="inline-flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  주제 묶음
                </span>
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(true)}
                  className="touch-target inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border/60 hover:bg-muted/50 text-[11px]"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              <div className="space-y-1.5">
                {problemsSorted.map((problem) => {
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
                          : "border-border/50 hover:bg-muted/50"
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
                          <p className="text-xs leading-snug line-clamp-2 text-foreground/90">{problem.title}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/80">
                            마지막 기록 {daysSince(problem.lastThoughtAt)}일 전
                          </p>
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
          {isSidebarOpen ? <ThoughtStreak /> : <Activity className="w-4 h-4 text-muted-foreground mt-2" />}
        </div>
      </aside>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="surface-panel-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 주제 묶음 만들기</DialogTitle>
            <DialogDescription>관련 기록을 모을 폴더 이름을 간단히 적어주세요.</DialogDescription>
          </DialogHeader>
          <Input
            value={createTitle}
            onChange={(event) => setCreateTitle(event.target.value)}
            placeholder="예: 온보딩 개선 실험"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={() => handleCreateProblem(createTitle)}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        "touch-target flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors whitespace-nowrap overflow-hidden",
        active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground",
        isOpen ? "justify-start px-3" : "justify-center"
      )}
    >
      {icon}
      {isOpen && <span className="text-sm">{label}</span>}
    </button>
  );
}
