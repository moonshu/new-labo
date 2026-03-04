"use client";

import { useMemo, useState } from "react";
import { useSystemStore } from "@/store/useSystemStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { cn } from "@/lib/utils";
import {
  createId,
  formatKoreanDate,
  formatKoreanDateTime,
  relationTypeLabel,
} from "@/lib/domain/thought-system";
import {
  X,
  Link2,
  CircleDot,
  ArrowRight,
  Save,
  Trash2,
  AlertTriangle,
  Plus,
  GitBranch,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import type { Relation, ThoughtClaim, ThoughtEvidence, ThoughtNode, ThoughtStatus } from "@/types/thought";

const STATUS_OPTIONS: ThoughtStatus[] = ["DRAFT", "HESITATED", "CONCLUDED"];

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
    updateNode,
    deleteNode,
  } = useSystemStore();
  const isFocused = useCanvasStore((state) => state.isFocused);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(null);

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

  const contradictionRelations = useMemo(
    () => linkedNodes.filter((entry) => entry.relation.relationType === "REFUTATION"),
    [linkedNodes]
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
          <h3 className="font-semibold text-sm text-foreground">관계성 (The Graph)</h3>
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
              타임라인에서 노드를 선택하면
              <br />
              관계성과 메타데이터를 확인할 수 있습니다.
            </p>
          )}

          {activeNode && (
            <>
              <NodeEditor
                key={activeNode.id}
                activeNode={activeNode}
                activeThemeName={activeTheme?.name ?? "-"}
                activeProblemTitle={activeProblem?.title ?? null}
                onSave={(payload) => {
                  try {
                    const result = updateNode({
                      nodeId: activeNode.id,
                      content: payload.content,
                      status: payload.status,
                      claims: payload.claims,
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

              <section className="rounded-lg border border-border/40 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                  <GitBranch className="w-3.5 h-3.5" />
                  충돌 주장
                </div>
                {!contradictionRelations.length && (
                  <p className="text-xs text-muted-foreground">현재 노드 기준 반박 관계가 없습니다.</p>
                )}
                {contradictionRelations.map(({ relation, target }) => (
                  <button
                    key={relation.id}
                    type="button"
                    onClick={() => setActiveNode(target.id)}
                    className="touch-target w-full rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-left"
                  >
                    <p className="text-[11px] text-amber-700/90 mb-1">반박 관계</p>
                    <p className="text-xs text-foreground/90 line-clamp-2">{target.content}</p>
                  </button>
                ))}
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

              <section className="rounded-lg border border-border/40 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  <CircleDot className="w-3.5 h-3.5" />
                  문제 상태
                </div>
                <p className="text-sm text-foreground/90">
                  {activeProblem
                    ? `${activeProblem.status} · 마지막 생각 ${formatKoreanDate(activeProblem.lastThoughtAt)}`
                    : "-"}
                </p>
              </section>

              <section className="rounded-lg border border-border/40 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Provenance
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>source: {activeNode.provenance.source}</p>
                  <p>analyzer: {activeNode.provenance.analyzerVersion}</p>
                  <p>promptHash: {activeNode.provenance.promptHash}</p>
                  <p>generatedAt: {formatKoreanDateTime(activeNode.provenance.generatedAt)}</p>
                  <p>retrievalIds: {activeNode.provenance.retrievalIds.length}</p>
                  <p>userEdited: {activeNode.provenance.userEditedSuggestion ? "yes" : "no"}</p>
                  <p>fromNudge: {activeNode.provenance.fromNudgeType ?? "none"}</p>
                  {activeNode.provenance.retrievalIds.length > 0 && (
                    <div className="rounded-md border border-border/50 p-2 mt-1 max-h-20 overflow-y-auto">
                      {activeNode.provenance.retrievalIds.map((id) => (
                        <p key={id} className="break-all">
                          - {id}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
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
  activeThemeName,
  activeProblemTitle,
  onSave,
  onDelete,
}: {
  activeNode: ThoughtNode;
  activeThemeName: string;
  activeProblemTitle: string | null;
  onSave: (payload: {
    content: string;
    status: ThoughtStatus;
    claims: ThoughtClaim[];
    evidence: ThoughtEvidence[];
  }) => void;
  onDelete: () => void;
}) {
  const [draftContent, setDraftContent] = useState(activeNode.content);
  const [draftStatus, setDraftStatus] = useState<ThoughtStatus>(activeNode.status);
  const [draftClaims, setDraftClaims] = useState<ThoughtClaim[]>(activeNode.claims);
  const [draftEvidence, setDraftEvidence] = useState<ThoughtEvidence[]>(activeNode.evidence);
  const [newEvidenceRef, setNewEvidenceRef] = useState("");

  const claimIds = draftClaims.map((claim) => claim.id);

  const addClaim = () => {
    setDraftClaims((prev) => [
      ...prev,
      {
        id: createId("claim"),
        text: "새 주장",
        confidence: 0.5,
        supports: [],
        attacks: [],
      },
    ]);
  };

  const updateClaim = (claimId: string, patch: Partial<ThoughtClaim>) => {
    setDraftClaims((prev) => prev.map((claim) => (claim.id === claimId ? { ...claim, ...patch } : claim)));
  };

  const removeClaim = (claimId: string) => {
    setDraftClaims((prev) =>
      prev
        .filter((claim) => claim.id !== claimId)
        .map((claim) => ({
          ...claim,
          supports: claim.supports.filter((id) => id !== claimId),
          attacks: claim.attacks.filter((id) => id !== claimId),
        }))
    );
  };

  const toggleClaimRelation = (
    claimId: string,
    type: "supports" | "attacks",
    targetId: string
  ) => {
    setDraftClaims((prev) =>
      prev.map((claim) => {
        if (claim.id !== claimId) return claim;
        const has = claim[type].includes(targetId);
        const oppositeType = type === "supports" ? "attacks" : "supports";
        const opposite = claim[oppositeType];
        return {
          ...claim,
          [type]: has ? claim[type].filter((id) => id !== targetId) : [...claim[type], targetId],
          [oppositeType]: has ? opposite : opposite.filter((id) => id !== targetId),
        };
      })
    );
  };

  const addEvidence = () => {
    const ref = newEvidenceRef.trim().replace(/\s+/g, " ");
    if (!ref) return;
    if (draftEvidence.some((item) => item.sourceRef.toLowerCase() === ref.toLowerCase())) return;

    setDraftEvidence((prev) => [
      ...prev,
      {
        id: createId("evidence"),
        type: "external_source",
        sourceRef: ref,
        relevance: 0.7,
      },
    ]);
    setNewEvidenceRef("");
  };

  const updateEvidence = (id: string, patch: Partial<ThoughtEvidence>) => {
    setDraftEvidence((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              sourceRef:
                typeof patch.sourceRef === "string"
                  ? patch.sourceRef.trim().replace(/\s+/g, " ")
                  : item.sourceRef,
              relevance:
                typeof patch.relevance === "number"
                  ? Math.max(0, Math.min(1, Number(patch.relevance.toFixed(2))))
                  : item.relevance,
            }
          : item
      )
    );
  };

  const removeEvidence = (id: string) => {
    setDraftEvidence((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground">현재 노드</h4>
      <Textarea
        value={draftContent}
        onChange={(event) => setDraftContent(event.target.value)}
        className="min-h-24 text-sm leading-relaxed font-serif"
      />

      <div className="flex items-center gap-2">
        <select
          value={draftStatus}
          onChange={(event) => setDraftStatus(event.target.value as ThoughtStatus)}
          className="h-10 sm:h-8 w-36 rounded-md border border-border/60 bg-background px-2 text-xs touch-manipulation"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const cleanedClaims = draftClaims
              .map((claim) => ({
                ...claim,
                text: claim.text.trim(),
              }))
              .filter((claim) => claim.text.length > 0);

            if (!cleanedClaims.length) {
              toast.error("최소 1개의 유효한 주장이 필요합니다.");
              return;
            }

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

            if (draftStatus === "CONCLUDED" && cleanedEvidence.length === 0) {
              toast.error("결론 상태에는 최소 1개의 근거가 필요합니다.");
              return;
            }

            onSave({
              content: cleanedContent,
              status: draftStatus,
              claims: cleanedClaims,
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
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Claims</p>
          <button
            type="button"
            onClick={addClaim}
            className="touch-target text-xs px-2.5 py-1 rounded border border-border/60 hover:bg-muted inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            추가
          </button>
        </div>

        {!draftClaims.length && <p className="text-xs text-muted-foreground">주장을 1개 이상 추가하세요.</p>}

        {draftClaims.map((claim) => (
          <div key={claim.id} className="rounded-md border border-border/50 p-2 space-y-2">
            <div className="flex items-center gap-2">
                <Input
                  value={claim.text}
                  onChange={(event) => updateClaim(claim.id, { text: event.target.value })}
                  className="h-10 sm:h-8"
                />
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={claim.confidence}
                  onChange={(event) =>
                    updateClaim(claim.id, {
                      confidence: Math.max(
                        0,
                        Math.min(1, Number(Number(event.target.value || 0).toFixed(2)))
                      ),
                    })
                  }
                  className="h-10 sm:h-8 w-24"
                />
                <button
                  type="button"
                  onClick={() => removeClaim(claim.id)}
                  className="touch-target-icon text-muted-foreground hover:text-destructive inline-flex items-center justify-center rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">supports</p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {claimIds
                    .filter((targetId) => targetId !== claim.id)
                    .map((targetId) => (
                      <label key={targetId} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={claim.supports.includes(targetId)}
                          onChange={() => toggleClaimRelation(claim.id, "supports", targetId)}
                        />
                        {targetId}
                      </label>
                    ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">attacks</p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {claimIds
                    .filter((targetId) => targetId !== claim.id)
                    .map((targetId) => (
                      <label key={targetId} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={claim.attacks.includes(targetId)}
                          onChange={() => toggleClaimRelation(claim.id, "attacks", targetId)}
                        />
                        {targetId}
                      </label>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-md border border-border/50 p-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Evidence</p>
        <div className="flex gap-2">
          <Input
            value={newEvidenceRef}
            onChange={(event) => setNewEvidenceRef(event.target.value)}
            placeholder="근거 링크 또는 노드 ID"
            className="h-10 sm:h-8"
          />
          <button
            type="button"
            onClick={addEvidence}
            className="touch-target h-10 sm:h-8 px-2.5 rounded-md border border-border/60 hover:bg-muted text-xs"
          >
            추가
          </button>
        </div>

        {draftEvidence.map((evidence) => (
          <div key={evidence.id} className="rounded-md border border-border/50 p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-foreground/90 break-all">{evidence.sourceRef}</p>
              <button
                type="button"
                onClick={() => removeEvidence(evidence.id)}
                className="touch-target-icon text-muted-foreground hover:text-destructive inline-flex items-center justify-center rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={evidence.type}
                  onChange={(event) =>
                    updateEvidence(evidence.id, {
                      type: event.target.value as ThoughtEvidence["type"],
                    })
                  }
                  className="h-10 sm:h-8 rounded-md border border-border/60 bg-background px-2 text-xs touch-manipulation"
                >
                <option value="external_source">외부 문헌</option>
                <option value="retrieved_doc">검색 문서</option>
                <option value="internal_note">내부 노트</option>
              </select>
                <Input
                  type="number"
                step="0.1"
                min="0"
                max="1"
                value={evidence.relevance}
                onChange={(event) =>
                  updateEvidence(evidence.id, {
                    relevance: Number(event.target.value || 0),
                  })
                }
                  className="h-10 sm:h-8"
                />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
        <span>주제: {activeThemeName}</span>
        <span>상태: {draftStatus}</span>
        <span className="col-span-2">날짜: {formatKoreanDate(activeNode.createdAt)}</span>
      </div>
      {activeProblemTitle && (
        <div className="pt-2 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground">연결 문제</p>
          <p className="text-sm text-foreground/90">{activeProblemTitle}</p>
        </div>
      )}
    </section>
  );
}
