"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { daysSince, isProblemStale } from "@/lib/domain/thought-system";
import { Menu, Book, ListTree, Activity, Moon, ChevronRight, Download, Upload, RotateCcw, Plus, Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ProblemStatus } from "@/types/thought";
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
  const importInputRef = useRef<HTMLInputElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const {
    isSidebarOpen,
    toggleSidebar,
    themes,
    problems,
    nodes,
    selectedProblemId,
    setSelectedProblem,
    setProblemStatus,
    createProblem,
    renameProblem,
    deleteProblem,
    exportData,
    importData,
    resetData,
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

  const handleExport = () => {
    try {
      const raw = exportData();
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `thought-system-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("데이터를 JSON으로 내보냈습니다.");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("내보내기에 실패했습니다.");
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = importData(text);
      if (result.ok) {
        toast.success("데이터를 가져왔습니다.");
      } else {
        toast.error(result.error ?? "가져오기에 실패했습니다.");
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("가져오기에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = () => {
    resetData();
    router.push("/");
    toast.success("데이터를 초기 상태로 되돌렸습니다.");
  };

  const handleCreateProblem = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("문제 제목을 입력해주세요.");
      return;
    }
    const created = createProblem(trimmed);
    router.push(`/problem/${created.id}`);
    setCreateDialogOpen(false);
    setCreateTitle("");
    toast.success("새 문제를 추가했습니다.");
  };

  const handleRenameProblem = (problemId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("문제 제목을 입력해주세요.");
      return;
    }
    renameProblem(problemId, trimmed);
    setRenameDialogOpen(false);
    setRenameTarget(null);
    setRenameTitle("");
    toast.success("문제 제목을 수정했습니다.");
  };

  const handleDeleteProblem = (problemId: string) => {
    const result = deleteProblem(problemId);
    router.push("/");
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    toast.success("문제를 삭제했습니다.", {
      description: `${result.removedNodes}개의 연결 노드를 함께 삭제했습니다.`,
    });
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
              <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2">
                <span className="inline-flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  열린 문제
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
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveStatus(problem.id, problem.status);
                                }}
                                className="touch-target text-[11px] px-2 py-1 rounded border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                              >
                                {STATUS_LABEL[problem.status]}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setRenameTarget({ id: problem.id, title: problem.title });
                                  setRenameTitle(problem.title);
                                  setRenameDialogOpen(true);
                                }}
                                className="touch-target-icon text-[10px] rounded border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center"
                                aria-label="Rename problem"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteTarget({ id: problem.id, title: problem.title });
                                  setDeleteDialogOpen(true);
                                }}
                                className="touch-target-icon text-[10px] rounded border border-destructive/50 text-destructive/90 hover:bg-destructive/10 inline-flex items-center justify-center"
                                aria-label="Delete problem"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportChange}
              />
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={handleExport}
                  className="touch-target h-10 md:h-8 rounded-md border border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  내보내기
                </button>
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="touch-target h-10 md:h-8 rounded-md border border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center justify-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  가져오기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteDialogOpen(true);
                  }}
                  className="touch-target h-10 md:h-8 rounded-md border border-destructive/40 text-[11px] text-destructive/90 hover:bg-destructive/10 inline-flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  초기화
                </button>
              </div>
              <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                <Moon className="w-4 h-4" /> <span>조용한 흐름으로 기록 중</span>
              </div>
            </>
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground mt-2" />
          )}
        </div>
      </aside>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="surface-panel-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 문제 만들기</DialogTitle>
            <DialogDescription>지금 추적하고 싶은 질문을 간단히 적어주세요.</DialogDescription>
          </DialogHeader>
          <Input
            value={createTitle}
            onChange={(event) => setCreateTitle(event.target.value)}
            placeholder="예: 사유 흐름을 방해하지 않는 기록법은 무엇인가?"
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

      <Dialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open);
          if (!open) {
            setRenameTarget(null);
            setRenameTitle("");
          }
        }}
      >
        <DialogContent className="surface-panel-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>문제 이름 변경</DialogTitle>
            <DialogDescription>질문의 표현을 현재 맥락에 맞게 다듬어보세요.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            placeholder="문제 제목"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (!renameTarget) return;
                handleRenameProblem(renameTarget.id, renameTitle);
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="surface-panel-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{deleteTarget ? "문제 삭제" : "데이터 초기화"}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `'${deleteTarget.title}' 문제와 연결된 노드/관계를 함께 제거합니다.`
                : "현재 로컬 데이터를 시드 상태로 되돌립니다."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  handleDeleteProblem(deleteTarget.id);
                  return;
                }
                handleReset();
                setDeleteDialogOpen(false);
              }}
            >
              {deleteTarget ? "문제 삭제" : "초기화"}
            </Button>
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
