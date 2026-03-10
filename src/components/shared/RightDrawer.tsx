"use client";

import { useState } from "react";
import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import { formatKoreanDate, relationTypeLabel } from "@/lib/domain/thought-system";
import { X, Link2, ArrowRight, Save, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Relation, ThoughtEvidence, ThoughtNode, ThoughtStatus } from "@/types/thought";

const STATUS_OPTIONS: ThoughtStatus[] = ["DRAFT", "HESITATED", "CONCLUDED"];
const STATUS_LABEL: Record<ThoughtStatus, string> = {
  DRAFT: "질문",
  HESITATED: "유보",
  CONCLUDED: "정리",
};

export default function RightDrawer() {
  const {
    isRightDrawerOpen,
    toggleRightDrawer,
    activeNodeId,
    nodes,
    problems,
    relations,
    setActiveNode,
    updateNode,
    deleteNode,
  } = useSystemStore();
  const isFocused = useCanvasStore((state) => state.isFocused);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(null);

  const activeNode = nodes.find((node) => node.id === activeNodeId) ?? null;
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
        relation.sourceNodeId === activeNode?.id ? relation.targetNodeId : relation.sourceNodeId;
      const target = nodes.find((node) => node.id === targetId);
      return target ? { relation, target } : null;
    })
    .filter(
      (
        entry
      ): entry is {
        relation: Relation;
        target: ThoughtNode;
      } => Boolean(entry)
    );

  return (
    <>
      {isRightDrawerOpen && (
        <button
          type="button"
          onClick={toggleRightDrawer}
          className="md:hidden fixed inset-0 bg-black/35 z-20"
          aria-label="Close relation drawer backdrop"
        />
      )}
      <aside
        className={cn(
          "surface-panel fixed right-0 top-0 h-screen border-l border-border/50 transform transition-all duration-300 z-30 flex flex-col w-full max-w-sm",
          isFocused && "opacity-30",
          isRightDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold text-sm text-foreground">노드 상세</h3>
          <button
            onClick={toggleRightDrawer}
            className="touch-target-icon rounded-md hover:bg-muted text-muted-foreground inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="soft-scroll flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {!activeNode && (
            <p className="text-sm text-muted-foreground text-center mt-10 leading-relaxed">
              타임라인 또는 그래프에서 노드를 선택하면
              <br />
              여기서 내용을 수정할 수 있습니다.
            </p>
          )}

          {activeNode && (
            <>
              <NodeEditor
                key={activeNode.id}
                activeNode={activeNode}
                activeProblemTitle={activeProblem?.title ?? null}
                onSave={(payload) => {
                  try {
                    const result = updateNode({
                      nodeId: activeNode.id,
                      content: payload.content,
                      status: payload.status,
                      tags: payload.tags,
                      evidence: payload.evidence,
                      provenance: {
                        ...activeNode.provenance,
                        userEditedSuggestion: true,
                      },
                    });
                    toast.success("노드가 업데이트되었습니다.", {
                      description: result.relationsCreated
                        ? `관계 ${result.relationsCreated}개를 다시 계산했습니다.`
                        : "관계를 유지했습니다.",
                    });
                  } catch (error) {
                    console.error("Update node failed:", error);
                    toast.error("노드 업데이트에 실패했습니다.", {
                      description: error instanceof Error ? error.message : undefined,
                    });
                  }
                }}
                onDelete={() => {
                  setPendingDeleteNodeId(activeNode.id);
                  setDeleteDialogOpen(true);
                }}
              />

              <section className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                  <Link2 className="w-3.5 h-3.5" />
                  연결 노드
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
                    className="touch-target w-full rounded-lg border border-border/50 hover:bg-muted/40 transition-colors p-3 text-left"
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
            </>
          )}
        </div>
      </aside>
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setPendingDeleteNodeId(null);
          }
        }}
      >
        <DialogContent className="surface-panel-strong sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>노드 삭제</DialogTitle>
            <DialogDescription>선택한 노드를 삭제하면 연결된 관계도 함께 정리됩니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="touch-target" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              className="touch-target"
              onClick={() => {
                if (!pendingDeleteNodeId) {
                  setDeleteDialogOpen(false);
                  return;
                }

                try {
                  deleteNode(pendingDeleteNodeId);
                  toast.success("노드를 삭제했습니다.");
                } catch (error) {
                  console.error("Delete node failed:", error);
                  toast.error("노드 삭제에 실패했습니다.");
                } finally {
                  setDeleteDialogOpen(false);
                  setPendingDeleteNodeId(null);
                }
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NodeEditor({
  activeNode,
  activeProblemTitle,
  onSave,
  onDelete,
}: {
  activeNode: ThoughtNode;
  activeProblemTitle: string | null;
  onSave: (payload: {
    content: string;
    status: ThoughtStatus;
    tags: string[];
    evidence: ThoughtEvidence[];
  }) => void;
  onDelete: () => void;
}) {
  const [draftContent, setDraftContent] = useState(activeNode.content);
  const [draftStatus, setDraftStatus] = useState<ThoughtStatus>(activeNode.status);
  const [draftTags] = useState<string[]>(activeNode.tags);
  const [draftEvidence] = useState<ThoughtEvidence[]>(activeNode.evidence);
  const hasNoEvidence = draftEvidence.filter((item) => item.sourceRef.trim()).length === 0;

  return (
    <section className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground">현재 노드</h4>
      <Textarea
        value={draftContent}
        onChange={(event) => setDraftContent(event.target.value)}
        className="min-h-24 text-sm leading-relaxed font-serif"
      />

      <div className="rounded-md border border-border/50 bg-muted/10 p-2 text-xs text-muted-foreground">
        태그/근거는 AI 분석값 기준으로 자동 유지됩니다. 원문을 수정한 뒤 다시 분석하면 자동 갱신됩니다.
      </div>

      <div className="flex items-center gap-2">
        <select
          value={draftStatus}
          onChange={(event) => setDraftStatus(event.target.value as ThoughtStatus)}
          className="h-10 sm:h-8 w-36 rounded-md border border-border/60 bg-background px-2 text-xs touch-manipulation"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const cleanedContent = draftContent.trim();
            if (!cleanedContent) {
              toast.error("노드 내용이 비어 있습니다.");
              return;
            }

            const cleanedEvidence = draftEvidence
              .map((evidence) => ({
                ...evidence,
                sourceRef: evidence.sourceRef.trim(),
                relevance: Math.max(0, Math.min(1, Number(evidence.relevance.toFixed(2)))),
              }))
              .filter((evidence) => Boolean(evidence.sourceRef));
            const cleanedTags = Array.from(
              new Set(
                draftTags
                  .map((tag) => tag.trim().replace(/^#/, "").replace(/\s+/g, " "))
                  .filter((tag) => tag.length >= 2)
                  .map((tag) => tag.slice(0, 24))
              )
            );
            const safeTags = cleanedTags.length ? cleanedTags : ["메모"];

            const safeStatus =
              draftStatus === "CONCLUDED" && cleanedEvidence.length === 0
                ? ("HESITATED" as ThoughtStatus)
                : draftStatus;

            if (safeStatus !== draftStatus) {
              toast.info("근거가 없어 상태를 자동으로 '유보'로 조정했습니다.");
            }

            onSave({
              content: cleanedContent,
              status: safeStatus,
              tags: safeTags,
              evidence: cleanedEvidence,
            });
          }}
          className="touch-target h-10 sm:h-8 px-3 sm:px-2.5 rounded-md bg-primary text-primary-foreground text-xs inline-flex items-center gap-1 hover:bg-primary/90"
        >
          <Save className="w-3.5 h-3.5" />
          저장
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="touch-target h-10 sm:h-8 px-3 sm:px-2.5 rounded-md border border-destructive/50 text-destructive/90 text-xs inline-flex items-center gap-1 hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          삭제
        </button>
      </div>

      <div className="space-y-2 rounded-md border border-border/50 p-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">AI Tags</p>
          <span className="text-[10px] text-muted-foreground">{draftTags.length}개</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {draftTags.map((tag) => (
            <span
              key={`${activeNode.id}-tag-${tag}`}
              className="rounded-full border border-border/60 bg-muted/25 px-2 py-1 text-xs text-foreground/85 inline-flex items-center gap-1"
            >
              <span>#{tag}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border/50 p-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">AI Evidence</p>
        {hasNoEvidence ? (
          <p className="text-xs text-muted-foreground">
            자동 감지된 근거가 없습니다. 상태를 &quot;정리&quot;로 바꾸면 저장 시 자동으로 &quot;유보&quot; 처리됩니다.
          </p>
        ) : (
          draftEvidence.map((evidence) => (
            <div key={evidence.id} className="rounded-md border border-border/50 p-2">
              <p className="text-xs text-foreground/90 break-all">{evidence.sourceRef}</p>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
        <span>상태: {STATUS_LABEL[draftStatus]}</span>
        <span className="col-span-2">날짜: {formatKoreanDate(activeNode.createdAt)}</span>
      </div>
      {activeProblemTitle && (
        <div className="pt-2 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground">연결 주제 묶음</p>
          <p className="text-sm text-foreground/90">{activeProblemTitle}</p>
        </div>
      )}
    </section>
  );
}
