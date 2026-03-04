export type ThoughtStatus = "DRAFT" | "HESITATED" | "CONCLUDED";

export type ProblemStatus = "OPEN" | "PENDING" | "RESOLVED" | "MERGED";

export type RelationType = "EXTENSION" | "REFUTATION" | "PARALLEL" | "REVISION";

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
}

export interface AddThoughtInput {
  content: string;
  suggestion: AISuggestion;
  selectedProblemId?: string | null;
}
