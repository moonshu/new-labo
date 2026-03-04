"use client";

import { useEffect, useMemo, useState } from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useSystemStore } from "@/store/useSystemStore";
import { cn } from "@/lib/utils";
import {
  createId,
  defaultSuggestion,
  evaluateSuggestionQualityGate,
} from "@/lib/domain/thought-system";
import {
  Loader2,
  ArrowRightCircle,
  HelpCircle,
  Sparkles,
  Link2,
  Save,
  AlertTriangle,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ThoughtEvidence, ThoughtStatus, UncertaintyLabel } from "@/types/thought";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS: ThoughtStatus[] = ["DRAFT", "HESITATED", "CONCLUDED"];
const UNCERTAINTY_OPTIONS: UncertaintyLabel[] = ["LOW", "MEDIUM", "HIGH"];
const STATUS_LABEL: Record<ThoughtStatus, string> = {
  DRAFT: "판단 유보",
  HESITATED: "망설임",
  CONCLUDED: "단정",
};
const UNCERTAINTY_LABEL: Record<UncertaintyLabel, string> = {
  LOW: "낮음",
  MEDIUM: "중간",
  HIGH: "높음",
};

function suggestionSnapshotKey(input: {
  status: ThoughtStatus;
  themeName: string;
  problemTitle: string;
  uncertaintyLabel: UncertaintyLabel;
  evidenceHints: ThoughtEvidence[];
}): string {
  const evidenceKey = input.evidenceHints
    .map((evidence) => `${evidence.type}:${evidence.sourceRef}:${evidence.relevance}`)
    .sort()
    .join("|");

  return [
    input.status,
    input.themeName.trim(),
    input.problemTitle.trim(),
    input.uncertaintyLabel,
    evidenceKey,
  ].join("::");
}

function defaultConfidence(label: UncertaintyLabel): number {
  if (label === "LOW") return 0.8;
  if (label === "MEDIUM") return 0.6;
  return 0.4;
}

export default function Editor() {
  const router = useRouter();
  const {
    content,
    setContent,
    isFocused,
    setFocused,
    isAnalyzing,
    setAnalyzing,
    suggestion,
    originalSuggestion,
    setSuggestion,
    patchSuggestion,
    clearCanvas,
    contextualNudge,
    setContextualNudge,
  } = useCanvasStore();

  const {
    addThought,
    themes,
    problems,
    nodes,
    selectedProblemId,
    setSelectedProblem,
    getContextNudge,
  } = useSystemStore();

  const [claimText, setClaimText] = useState("");
  const [evidenceDraft, setEvidenceDraft] = useState<ThoughtEvidence[]>([]);
  const [manualEvidenceRef, setManualEvidenceRef] = useState("");

  const selectedProblem = selectedProblemId
    ? problems.find((problem) => problem.id === selectedProblemId) ?? null
    : null;

  const systemSnapshot = `${problems.length}-${themes.length}-${nodes.length}`;

  useEffect(() => {
    const trimmed = content.trim();
    if (!trimmed) {
      setContextualNudge(null);
      if (!isFocused) return;

      const timer = window.setTimeout(() => {
        setContextualNudge(getContextNudge(content));
      }, 60_000);

      return () => window.clearTimeout(timer);
    }

    setContextualNudge(getContextNudge(content));
  }, [content, getContextNudge, setContextualNudge, systemSnapshot, isFocused]);

  useEffect(() => {
    if (!originalSuggestion) {
      setEvidenceDraft([]);
      setClaimText("");
      setManualEvidenceRef("");
      return;
    }

    setEvidenceDraft(originalSuggestion.evidenceHints ?? []);
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    setClaimText(firstSentence || content.trim() || "핵심 주장을 입력하세요.");
    setManualEvidenceRef("");
  }, [originalSuggestion, content]);

  const evaluatedSuggestion = useMemo(() => {
    if (!suggestion) return null;
    return evaluateSuggestionQualityGate({
      ...suggestion,
      evidenceHints: evidenceDraft,
    });
  }, [suggestion, evidenceDraft]);

  const isConcludedBlocked = suggestion?.status === "CONCLUDED" && evaluatedSuggestion?.passed === false;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (suggestion) {
        handleSave();
      } else {
        handleAnalyze();
      }
    }
  };

  const handleAnalyze = async () => {
    if (!content.trim()) return;

    setAnalyzing(true);
    setFocused(false);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          existingThemes: themes.map((theme) => theme.name),
          activeProblems: problems
            .filter((problem) => problem.status === "OPEN")
            .map((problem) => problem.title),
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();

      const analyzed = {
        problemTitle: typeof result.problemTitle === "string" ? result.problemTitle : "새 문제",
        themeName: typeof result.themeName === "string" ? result.themeName : "새 주제",
        status: (result.status as ThoughtStatus) || "DRAFT",
        uncertaintyLabel: (result.uncertaintyLabel as UncertaintyLabel) || "MEDIUM",
        evidenceHints: Array.isArray(result.evidenceHints)
          ? result.evidenceHints.filter(
              (item: unknown): item is ThoughtEvidence =>
                Boolean(item) &&
                typeof item === "object" &&
                typeof (item as ThoughtEvidence).sourceRef === "string" &&
                typeof (item as ThoughtEvidence).type === "string" &&
                typeof (item as ThoughtEvidence).relevance === "number"
            )
          : [],
        provenance:
          result.provenance && typeof result.provenance === "object"
            ? result.provenance
            : defaultSuggestion(content).provenance,
        qualityGate: {
          passed: true,
          reasons: [],
        },
      };

      const gate = evaluateSuggestionQualityGate(analyzed);
      const adjusted = {
        ...analyzed,
        status:
          analyzed.status === "CONCLUDED" && !gate.passed && analyzed.evidenceHints.length === 0
            ? ("HESITATED" as ThoughtStatus)
            : analyzed.status,
      };
      const adjustedGate = evaluateSuggestionQualityGate(adjusted);

      setSuggestion({
        ...adjusted,
        qualityGate: adjustedGate,
      });

      if (!adjustedGate.passed) {
        toast.warning("품질 게이트 미통과 제안입니다. 근거를 보강하거나 상태를 조정하세요.");
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      const fallback = defaultSuggestion(content);
      setSuggestion(fallback);
      toast.warning("AI 응답이 지연되어 임시 제안을 사용합니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const addEvidenceRef = () => {
    const nextRef = manualEvidenceRef.trim().replace(/\s+/g, " ");
    if (!nextRef) return;

    const duplicated = evidenceDraft.some(
      (item) => item.sourceRef.toLowerCase() === nextRef.toLowerCase()
    );
    if (duplicated) {
      toast.info("이미 추가된 근거입니다.");
      return;
    }

    setEvidenceDraft((prev) => [
      ...prev,
      {
        id: createId("evidence"),
        type: "external_source",
        sourceRef: nextRef,
        relevance: 0.7,
      },
    ]);
    setManualEvidenceRef("");
  };

  const updateEvidence = (id: string, patch: Partial<ThoughtEvidence>) => {
    setEvidenceDraft((prev) =>
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
    setEvidenceDraft((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (!content.trim()) return;

    try {
      const fallbackSuggestion = defaultSuggestion(content);
      const finalSuggestion = suggestion
        ? {
            ...suggestion,
            evidenceHints: evidenceDraft,
            qualityGate: evaluateSuggestionQualityGate({ ...suggestion, evidenceHints: evidenceDraft }),
          }
        : {
            ...fallbackSuggestion,
            evidenceHints: evidenceDraft,
            qualityGate: evaluateSuggestionQualityGate({ ...fallbackSuggestion, evidenceHints: evidenceDraft }),
          };

      if (!finalSuggestion.qualityGate.passed) {
        toast.error("저장 조건을 충족하지 못했습니다.", {
          description: finalSuggestion.qualityGate.reasons.join(" · "),
        });
        return;
      }

      const originalKey = originalSuggestion
        ? suggestionSnapshotKey({
            ...originalSuggestion,
            evidenceHints: originalSuggestion.evidenceHints,
          })
        : "";
      const currentKey = suggestionSnapshotKey({
        ...finalSuggestion,
        evidenceHints: evidenceDraft,
      });
      const userEditedSuggestion = Boolean(originalSuggestion && originalKey !== currentKey);

      const result = addThought(content, finalSuggestion, {
        claims: [
          {
            id: createId("claim"),
            text: claimText.trim() || content.trim(),
            confidence: defaultConfidence(finalSuggestion.uncertaintyLabel),
            supports: [],
            attacks: [],
          },
        ],
        evidence: evidenceDraft,
        provenance: {
          ...finalSuggestion.provenance,
          userEditedSuggestion,
          fromNudgeType: contextualNudge?.type ?? null,
        },
        userEditedSuggestion,
        fromNudgeType: contextualNudge?.type ?? null,
      });

      clearCanvas();
      toast.success(`저장됨 · ${result.problem.title}`, {
        description: result.relationsCreated
          ? `관계 ${result.relationsCreated}개가 연결되었습니다.`
          : "새 노드가 추가되었습니다.",
      });
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  const handleIdk = () => {
    if (!content.trim()) return;
    const base = suggestion ?? defaultSuggestion(content);
    const draftSuggestion = {
      ...base,
      status: "DRAFT" as ThoughtStatus,
      themeName: suggestion?.themeName || "사유",
      problemTitle: selectedProblem?.title || suggestion?.problemTitle || "지금의 고민은 무엇일까?",
      uncertaintyLabel: "HIGH" as UncertaintyLabel,
      qualityGate: {
        passed: true,
        reasons: [],
      },
    };

    try {
      const result = addThought(content, draftSuggestion, {
        claims: [
          {
            id: createId("claim"),
            text: claimText.trim() || content.trim(),
            confidence: 0.35,
            supports: [],
            attacks: [],
          },
        ],
        evidence: evidenceDraft,
        provenance: {
          ...draftSuggestion.provenance,
          userEditedSuggestion: true,
          fromNudgeType: contextualNudge?.type ?? null,
        },
        userEditedSuggestion: true,
        fromNudgeType: contextualNudge?.type ?? null,
      });
      clearCanvas();
      toast.success(`유보 노드 저장됨 · ${result.problem.title}`);
    } catch (error) {
      console.error("Draft save failed:", error);
      toast.error("유보 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div
      className={cn(
        "relative w-[40rem] max-w-full mx-auto transition-all duration-500",
        isFocused ? "opacity-100 scale-100 z-50" : "opacity-90 scale-95"
      )}
    >
      <div className="surface-panel-strong relative group ring-1 ring-primary/12 focus-within:ring-primary/30 transition-all p-1.5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="지금 맴도는 생각은 무엇인가요?"
          disabled={isAnalyzing}
          className="w-full min-h-[120px] bg-transparent resize-none p-4 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50 font-serif"
          style={{ height: Math.max(120, content.split("\n").length * 28 + 40) + "px" }}
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
          <button
            onClick={handleIdk}
            className="touch-target text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors px-3 sm:px-2 py-1.5 sm:py-1 rounded-md hover:bg-muted"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>아직 모르겠음</span>
          </button>

          <button
            onClick={handleAnalyze}
            disabled={!content.trim() || isAnalyzing}
            className="touch-target text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors px-3 sm:px-2 py-1.5 sm:py-1 rounded-md hover:bg-primary/10"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>분석</span>
                <ArrowRightCircle className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {contextualNudge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 right-0 -top-14"
          >
            <div className="mx-auto w-fit max-w-full px-3 py-1.5 rounded-full border border-border/60 bg-background/90 backdrop-blur text-xs text-muted-foreground flex items-center gap-2 shadow">
              <Link2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-[32rem]">{contextualNudge.message}</span>
              {contextualNudge.targetProblemId && (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setSelectedProblem(contextualNudge.targetProblemId!);
                    router.push(`/problem/${contextualNudge.targetProblemId!}`);
                  }}
                >
                  열기
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {suggestion && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full mt-4"
          >
            <div className="mx-auto w-[48rem] max-w-full surface-panel-strong p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 제안 (수정 후 저장 가능)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px]">
                  {evaluatedSuggestion?.passed ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      품질 게이트 통과
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      품질 게이트 점검 필요
                    </>
                  )}
                </span>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map((status) => (
                  <Chip
                    key={status}
                    label={STATUS_LABEL[status]}
                    variant={suggestion.status === status ? "primary" : "outline"}
                    onClick={() => patchSuggestion({ status })}
                  />
                ))}
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {UNCERTAINTY_OPTIONS.map((label) => (
                  <Chip
                    key={label}
                    label={`불확실성 ${UNCERTAINTY_LABEL[label]}`}
                    variant={suggestion.uncertaintyLabel === label ? "primary" : "outline"}
                    onClick={() => patchSuggestion({ uncertaintyLabel: label })}
                  />
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-2">
                <Input
                  value={suggestion.problemTitle}
                  onChange={(event) => patchSuggestion({ problemTitle: event.target.value })}
                  placeholder="연결할 질문"
                />
                <Input
                  value={suggestion.themeName}
                  onChange={(event) => patchSuggestion({ themeName: event.target.value })}
                  placeholder="연결할 주제"
                />
              </div>

              <div className="space-y-2 rounded-lg border border-border/50 p-2.5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">핵심 주장(Claim)</p>
                <Input
                  value={claimText}
                  onChange={(event) => setClaimText(event.target.value)}
                  placeholder="저장할 핵심 주장"
                />
              </div>

              <div className="space-y-2 rounded-lg border border-border/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">근거(Evidence)</p>
                  <span className="text-[11px] text-muted-foreground">{evidenceDraft.length}개 연결</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={manualEvidenceRef}
                    onChange={(event) => setManualEvidenceRef(event.target.value)}
                    placeholder="근거 링크 또는 노드 ID 추가"
                  />
                  <button
                    type="button"
                    onClick={addEvidenceRef}
                    className="touch-target h-10 sm:h-9 px-3 rounded-md border border-border/70 text-xs text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    추가
                  </button>
                </div>

                {!evidenceDraft.length && (
                  <p className="text-xs text-amber-600/90">근거가 없으면 결론 상태로 저장할 수 없습니다.</p>
                )}

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {evidenceDraft.map((item) => (
                    <div key={item.id} className="rounded-md border border-border/50 p-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-foreground/90 break-all">{item.sourceRef}</p>
                        <button
                          type="button"
                          onClick={() => removeEvidence(item.id)}
                          className="touch-target-icon text-muted-foreground hover:text-destructive inline-flex items-center justify-center rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={item.type}
                          onChange={(event) =>
                            updateEvidence(item.id, {
                              type: event.target.value as ThoughtEvidence["type"],
                            })
                          }
                          className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs"
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
                          value={item.relevance}
                          onChange={(event) =>
                            updateEvidence(item.id, {
                              relevance: Number(event.target.value || 0),
                            })
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {evaluatedSuggestion && !evaluatedSuggestion.passed && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 space-y-1">
                  {evaluatedSuggestion.reasons.map((reason) => (
                    <p key={reason}>- {reason}</p>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {selectedProblem
                    ? `현재 선택 문제: ${selectedProblem.title}`
                    : "문제를 선택하지 않으면 AI 제안 기준으로 저장됩니다."}
                </p>
                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="touch-target text-xs px-3 sm:px-2.5 py-1.5 rounded-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted w-full sm:w-auto"
                  >
                    다시 분석
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isConcludedBlocked}
                    className={cn(
                      "touch-target text-xs px-3 sm:px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-1 w-full sm:w-auto",
                      isConcludedBlocked && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <Save className="w-3.5 h-3.5" />
                    저장하기
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({
  label,
  variant,
  onClick,
}: {
  label: string;
  variant: "primary" | "outline";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "touch-target px-3.5 sm:px-3 py-1.5 sm:py-1 text-xs rounded-full border border-border/50 bg-card hover:bg-muted transition-colors text-muted-foreground cursor-pointer shadow-sm",
        variant === "primary" && "border-primary/20 text-primary bg-primary/5 hover:bg-primary/10"
      )}
    >
      {label}
    </button>
  );
}
