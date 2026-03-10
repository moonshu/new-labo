export type ThoughtStatus = "DRAFT" | "HESITATED" | "CONCLUDED";
export type UncertaintyLabel = "LOW" | "MEDIUM" | "HIGH";

export type ProblemStatus = "OPEN" | "PENDING" | "RESOLVED" | "MERGED";

export type RelationType = "EXTENSION" | "REFUTATION" | "PARALLEL" | "REVISION";
export type EvidenceType = "internal_note" | "external_source" | "retrieved_doc";

export interface Theme {
  id: string;
  name: string;
  createdAt: string;
}

export interface Problem {
  id: string;
  title: string;
  status: ProblemStatus;
  createdAt: string;
  lastThoughtAt: string;
  relatedNodeIds: string[];
}

export interface ThoughtNode {
  id: string;
  content: string;
  status: ThoughtStatus;
  createdAt: string;
  problemId: string;
  themeId: string;
  tags: string[];
  claims: ThoughtClaim[];
  evidence: ThoughtEvidence[];
  provenance: ThoughtProvenance;
  hasEvidenceWarning: boolean;
}

export interface Relation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  score: number;
  createdAt: string;
}

export interface ContextNudge {
  type: "revisit" | "link";
  message: string;
  targetProblemId?: string;
  targetNodeId?: string;
}

export interface ThoughtClaim {
  id: string;
  text: string;
  confidence: number;
  supports: string[];
  attacks: string[];
}

export interface ThoughtEvidence {
  id: string;
  type: EvidenceType;
  sourceRef: string;
  relevance: number;
}

export interface ThoughtProvenance {
  analyzerVersion: string;
  promptHash: string;
  retrievalIds: string[];
  generatedAt: string;
  source: "ai" | "manual" | "fallback";
  userEditedSuggestion: boolean;
  fromNudgeType: ContextNudge["type"] | null;
}

export interface SuggestionQualityGate {
  passed: boolean;
  reasons: string[];
}

export interface ThoughtSystemData {
  themes: Theme[];
  problems: Problem[];
  nodes: ThoughtNode[];
  relations: Relation[];
}

export interface AISuggestion {
  themeName: string;
  problemTitle: string;
  status: ThoughtStatus;
  tags: string[];
  uncertaintyLabel: UncertaintyLabel;
  evidenceHints: ThoughtEvidence[];
  provenance: ThoughtProvenance;
  qualityGate: SuggestionQualityGate;
}

export interface AddThoughtInput {
  content: string;
  suggestion: AISuggestion;
  selectedProblemId?: string | null;
  tags?: string[];
  claims?: ThoughtClaim[];
  evidence?: ThoughtEvidence[];
  provenance?: ThoughtProvenance;
  userEditedSuggestion?: boolean;
  fromNudgeType?: ContextNudge["type"] | null;
}
