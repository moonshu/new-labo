import type {
  AddThoughtInput,
  AISuggestion,
  ContextNudge,
  Problem,
  ProblemStatus,
  Relation,
  RelationType,
  SuggestionQualityGate,
  Theme,
  ThoughtClaim,
  ThoughtEvidence,
  ThoughtNode,
  ThoughtProvenance,
  ThoughtSystemData,
  ThoughtStatus,
  UncertaintyLabel,
} from "@/types/thought";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_REFLECTION_HOURS = 7 * 24;
const STALE_HOURS = 72;
const THOUGHT_STATUS: ThoughtStatus[] = ["DRAFT", "HESITATED", "CONCLUDED"];
const PROBLEM_STATUS: ProblemStatus[] = ["OPEN", "PENDING", "RESOLVED", "MERGED"];
const RELATION_TYPES: RelationType[] = ["EXTENSION", "REFUTATION", "PARALLEL", "REVISION"];
const UNCERTAINTY_LABELS: UncertaintyLabel[] = ["LOW", "MEDIUM", "HIGH"];
const EVIDENCE_TYPES: ThoughtEvidence["type"][] = [
  "internal_note",
  "external_source",
  "retrieved_doc",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "have",
  "will",
  "would",
  "there",
  "about",
  "into",
  "what",
  "when",
  "where",
  "how",
  "why",
  "나는",
  "그리고",
  "하지만",
  "에서",
  "으로",
  "에게",
  "그냥",
  "정말",
  "너무",
  "같다",
  "있다",
  "없다",
  "이다",
  "한다",
]);

function toDate(input?: string | Date): Date {
  if (!input) return new Date();
  return input instanceof Date ? input : new Date(input);
}

function dayKey(input: string | Date): string {
  const date = toDate(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nowIso(input?: string | Date): string {
  return toDate(input).toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isThoughtStatus(value: string): value is ThoughtStatus {
  return THOUGHT_STATUS.includes(value as ThoughtStatus);
}

function isProblemStatus(value: string): value is ProblemStatus {
  return PROBLEM_STATUS.includes(value as ProblemStatus);
}

function isRelationType(value: string): value is RelationType {
  return RELATION_TYPES.includes(value as RelationType);
}

function isUncertaintyLabel(value: string): value is UncertaintyLabel {
  return UNCERTAINTY_LABELS.includes(value as UncertaintyLabel);
}

function isEvidenceType(value: string): value is ThoughtEvidence["type"] {
  return EVIDENCE_TYPES.includes(value as ThoughtEvidence["type"]);
}

export function createId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${uuid}`;
}

export function normalizeLabel(label: string, fallback: string): string {
  const compact = label.trim().replace(/\s+/g, " ");
  if (!compact) return fallback;
  return compact.slice(0, 80);
}

function clampScore(value: number, fallback = 0.6): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function normalizeSourceRef(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.slice(0, 240);
}

export function createDefaultProvenance(params?: {
  generatedAt?: string | Date;
  source?: ThoughtProvenance["source"];
  userEditedSuggestion?: boolean;
  fromNudgeType?: ContextNudge["type"] | null;
}): ThoughtProvenance {
  return {
    analyzerVersion: "manual-v1",
    promptHash: "manual",
    retrievalIds: [],
    generatedAt: nowIso(params?.generatedAt),
    source: params?.source ?? "manual",
    userEditedSuggestion: params?.userEditedSuggestion ?? false,
    fromNudgeType: params?.fromNudgeType ?? null,
  };
}

export function createDefaultEvidence(content: string): ThoughtEvidence[] {
  const refs = Array.from(
    new Set(
      content.match(/https?:\/\/[^\s)]+/g)?.map((ref) => ref.trim()).filter(Boolean) ?? []
    )
  );

  return refs.slice(0, 3).map((sourceRef, index) => ({
    id: createId(`ev${index}`),
    type: "external_source",
    sourceRef,
    relevance: 0.7,
  }));
}

export function createDefaultClaim(content: string): ThoughtClaim[] {
  const sentence = normalizeLabel(content.split(/[.!?]/)[0] ?? content, content);
  return [
    {
      id: createId("claim"),
      text: sentence || "핵심 주장을 정리해보자.",
      confidence: 0.5,
      supports: [],
      attacks: [],
    },
  ];
}

function normalizeClaim(input: ThoughtClaim): ThoughtClaim {
  return {
    id: input.id || createId("claim"),
    text: normalizeLabel(input.text, "핵심 주장을 입력하세요."),
    confidence: clampScore(input.confidence, 0.5),
    supports: Array.isArray(input.supports) ? input.supports.filter((id) => typeof id === "string") : [],
    attacks: Array.isArray(input.attacks) ? input.attacks.filter((id) => typeof id === "string") : [],
  };
}

function normalizeEvidence(input: ThoughtEvidence): ThoughtEvidence {
  return {
    id: input.id || createId("evidence"),
    type: isEvidenceType(input.type) ? input.type : "internal_note",
    sourceRef: normalizeSourceRef(input.sourceRef),
    relevance: clampScore(input.relevance, 0.6),
  };
}

function sanitizeClaims(claims: ThoughtClaim[]): ThoughtClaim[] {
  const normalized = claims.map(normalizeClaim);
  const ids = new Set(normalized.map((claim) => claim.id));

  const cleaned = normalized.map((claim) => {
    const supports = Array.from(
      new Set(claim.supports.filter((targetId) => targetId !== claim.id && ids.has(targetId)))
    );
    const attacks = Array.from(
      new Set(
        claim.attacks.filter(
          (targetId) => targetId !== claim.id && ids.has(targetId) && !supports.includes(targetId)
        )
      )
    );

    return {
      ...claim,
      supports,
      attacks,
    };
  });

  return cleaned.length ? cleaned : createDefaultClaim("핵심 주장을 입력하세요.");
}

function sanitizeEvidence(evidenceList: ThoughtEvidence[]): ThoughtEvidence[] {
  const seen = new Set<string>();
  const next: ThoughtEvidence[] = [];

  for (const raw of evidenceList) {
    const evidence = normalizeEvidence(raw);
    if (!evidence.sourceRef) continue;
    const key = evidence.sourceRef.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(evidence);
  }

  return next;
}

function normalizeProvenance(
  input: ThoughtProvenance | undefined,
  defaults?: { generatedAt?: string | Date; source?: ThoughtProvenance["source"] }
): ThoughtProvenance {
  if (!input) {
    return createDefaultProvenance({
      generatedAt: defaults?.generatedAt,
      source: defaults?.source,
    });
  }

  return {
    analyzerVersion: normalizeLabel(input.analyzerVersion ?? "", "manual-v1"),
    promptHash: normalizeLabel(input.promptHash ?? "", "manual"),
    retrievalIds: Array.isArray(input.retrievalIds)
      ? input.retrievalIds.filter((id) => typeof id === "string")
      : [],
    generatedAt: nowIso(input.generatedAt ?? defaults?.generatedAt),
    source: input.source ?? defaults?.source ?? "manual",
    userEditedSuggestion: Boolean(input.userEditedSuggestion),
    fromNudgeType: input.fromNudgeType ?? null,
  };
}

export function formatKoreanDate(input: string | Date): string {
  const date = toDate(input);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function formatKoreanDateTime(input: string | Date): string {
  const date = toDate(input);
  return `${formatKoreanDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

export function hoursSince(input: string | Date, now?: string | Date): number {
  const target = toDate(input).getTime();
  const ref = toDate(now).getTime();
  return Math.max(0, (ref - target) / (60 * 60 * 1000));
}

export function daysSince(input: string | Date, now?: string | Date): number {
  const target = toDate(input).getTime();
  const ref = toDate(now).getTime();
  return Math.max(0, Math.floor((ref - target) / DAY_MS));
}

export function isProblemStale(problem: Problem, now?: string | Date): boolean {
  return problem.status === "OPEN" && hoursSince(problem.lastThoughtAt, now) >= STALE_HOURS;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token));
}

function similarityScore(a: string, b: string): number {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);

  if (!aTokens.length || !bTokens.length) return 0;

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);

  let overlap = 0;
  for (const token of aSet) {
    if (bSet.has(token)) overlap += 1;
  }

  if (!overlap) return 0;

  const union = new Set([...aSet, ...bSet]).size;
  return overlap / union;
}

function inferRelationType(source: string, target: string): RelationType {
  const merged = `${source.toLowerCase()} ${target.toLowerCase()}`;

  if (/(아니|반박|but|however|not|reject|disagree)/.test(merged)) {
    return "REFUTATION";
  }

  if (/(수정|다시|revisit|update|revise|changed)/.test(merged)) {
    return "REVISION";
  }

  if (/(확장|extend|deeper|further|근거|because)/.test(merged)) {
    return "EXTENSION";
  }

  return "PARALLEL";
}

function ensureTheme(
  themes: Theme[],
  name: string,
  timestamp: string
): { themes: Theme[]; theme: Theme } {
  const normalized = normalizeLabel(name, "기타").toLowerCase();
  const existing = themes.find((item) => item.name.toLowerCase() === normalized);

  if (existing) {
    return { themes, theme: existing };
  }

  const created: Theme = {
    id: createId("theme"),
    name: normalizeLabel(name, "기타"),
    createdAt: timestamp,
  };

  return {
    themes: [created, ...themes],
    theme: created,
  };
}

function ensureProblem(
  problems: Problem[],
  title: string,
  selectedProblemId: string | null | undefined,
  timestamp: string
): { problems: Problem[]; problem: Problem } {
  const normalizedTitle = normalizeLabel(title, "지금의 고민은 무엇일까?");
  const normalizedLookup = normalizedTitle.toLowerCase();

  const selected = selectedProblemId
    ? problems.find((problem) => problem.id === selectedProblemId)
    : null;

  if (selected) {
    return { problems, problem: selected };
  }

  const byTitle = problems.find((problem) => problem.title.toLowerCase() === normalizedLookup);

  if (byTitle) {
    return { problems, problem: byTitle };
  }

  if (selected && !title.trim()) {
    return { problems, problem: selected };
  }

  const created: Problem = {
    id: createId("problem"),
    title: normalizedTitle,
    status: "OPEN",
    createdAt: timestamp,
    lastThoughtAt: timestamp,
    relatedNodeIds: [],
  };

  return {
    problems: [created, ...problems],
    problem: created,
  };
}

function createRelationsForNode(
  node: ThoughtNode,
  allNodes: ThoughtNode[],
  timestamp: string
): Relation[] {
  const candidates = allNodes
    .filter((item) => item.id !== node.id)
    .map((candidate) => {
      const score = similarityScore(node.content, candidate.content);
      return {
        candidate,
        score,
      };
    })
    .filter((item) => item.score >= 0.14)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  return candidates.map(({ candidate, score }) => ({
    id: createId("relation"),
    sourceNodeId: node.id,
    targetNodeId: candidate.id,
    relationType: inferRelationType(node.content, candidate.content),
    score,
    createdAt: timestamp,
  }));
}

export function createSeedData(referenceNow?: string | Date): ThoughtSystemData {
  const now = toDate(referenceNow);
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();

  const themes: Theme[] = [
    {
      id: "theme_productivity",
      name: "생산성",
      createdAt: at(22),
    },
    {
      id: "theme_writing",
      name: "글쓰기",
      createdAt: at(18),
    },
  ];

  const problems: Problem[] = [
    {
      id: "problem_core",
      title: "완결을 강요하지 않는 기록 방식은 어떻게 설계할까?",
      status: "OPEN",
      createdAt: at(20),
      lastThoughtAt: at(4),
      relatedNodeIds: ["node_1", "node_2", "node_3"],
    },
    {
      id: "problem_stale",
      title: "생산성을 측정하지 않고도 성장을 확인할 수 있을까?",
      status: "OPEN",
      createdAt: at(15),
      lastThoughtAt: at(8),
      relatedNodeIds: ["node_4"],
    },
  ];

  const nodes: ThoughtNode[] = [
    {
      id: "node_1",
      content: "폴더 구조를 먼저 정하려다 기록 자체를 미루게 된다.",
      status: "DRAFT",
      createdAt: at(20),
      problemId: "problem_core",
      themeId: "theme_productivity",
      claims: [
        {
          id: "claim_n1",
          text: "구조 설계 집착이 기록 시작을 지연시킨다.",
          confidence: 0.66,
          supports: [],
          attacks: [],
        },
      ],
      evidence: [],
      provenance: createDefaultProvenance({
        generatedAt: at(20),
        source: "manual",
      }),
      hasEvidenceWarning: false,
    },
    {
      id: "node_2",
      content: "질문을 먼저 적고 생각을 이어붙이면 흐름이 끊기지 않는다.",
      status: "HESITATED",
      createdAt: at(12),
      problemId: "problem_core",
      themeId: "theme_writing",
      claims: [
        {
          id: "claim_n2",
          text: "질문 선행 방식이 사고 지속성에 유리할 수 있다.",
          confidence: 0.58,
          supports: [],
          attacks: [],
        },
      ],
      evidence: [],
      provenance: createDefaultProvenance({
        generatedAt: at(12),
        source: "manual",
      }),
      hasEvidenceWarning: false,
    },
    {
      id: "node_3",
      content: "정답을 쓰는 앱보다 변화 기록이 남는 앱이 더 오래 쓰인다.",
      status: "CONCLUDED",
      createdAt: at(4),
      problemId: "problem_core",
      themeId: "theme_writing",
      claims: [
        {
          id: "claim_n3",
          text: "변화 궤적 중심 UX가 장기 사용성에 유리하다.",
          confidence: 0.72,
          supports: [],
          attacks: [],
        },
      ],
      evidence: [
        {
          id: "evidence_n3",
          type: "internal_note",
          sourceRef: "node_2",
          relevance: 0.7,
        },
      ],
      provenance: createDefaultProvenance({
        generatedAt: at(4),
        source: "manual",
      }),
      hasEvidenceWarning: false,
    },
    {
      id: "node_4",
      content: "오늘 기록량보다 질문을 다시 붙잡은 횟수가 더 중요한 지표다.",
      status: "HESITATED",
      createdAt: at(8),
      problemId: "problem_stale",
      themeId: "theme_productivity",
      claims: [
        {
          id: "claim_n4",
          text: "회고 재진입 빈도가 더 의미 있는 생산성 지표일 수 있다.",
          confidence: 0.57,
          supports: [],
          attacks: [],
        },
      ],
      evidence: [],
      provenance: createDefaultProvenance({
        generatedAt: at(8),
        source: "manual",
      }),
      hasEvidenceWarning: false,
    },
  ];

  const relations: Relation[] = [
    {
      id: "relation_1",
      sourceNodeId: "node_3",
      targetNodeId: "node_1",
      relationType: "REVISION",
      score: 0.31,
      createdAt: at(4),
    },
    {
      id: "relation_2",
      sourceNodeId: "node_2",
      targetNodeId: "node_1",
      relationType: "EXTENSION",
      score: 0.28,
      createdAt: at(12),
    },
  ];

  return {
    themes,
    problems,
    nodes,
    relations,
  };
}

export function evaluateSuggestionQualityGate(suggestion: AISuggestion): SuggestionQualityGate {
  const reasons: string[] = [];
  const evidenceHints = Array.isArray(suggestion.evidenceHints) ? suggestion.evidenceHints : [];

  if (!isUncertaintyLabel(suggestion.uncertaintyLabel)) {
    reasons.push("불확실성 라벨이 필요합니다.");
  }

  if (suggestion.status === "CONCLUDED" && evidenceHints.length === 0) {
    reasons.push("결론 상태에는 최소 1개의 근거가 필요합니다.");
  }

  if (suggestion.status === "CONCLUDED" && suggestion.uncertaintyLabel === "HIGH") {
    reasons.push("불확실성이 높은 제안은 결론 상태로 저장할 수 없습니다.");
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

export function defaultSuggestion(content: string): AISuggestion {
  const normalized = normalizeLabel(content, "");

  const status: ThoughtStatus = /\?|왜|어떻게|모르/.test(normalized)
    ? "DRAFT"
    : /아마|일단|아직|불확실/.test(normalized)
      ? "HESITATED"
      : "CONCLUDED";

  const uncertaintyLabel: UncertaintyLabel =
    status === "DRAFT" ? "HIGH" : status === "HESITATED" ? "MEDIUM" : "LOW";
  const evidenceHints = createDefaultEvidence(normalized);

  const suggestion: AISuggestion = {
    status,
    themeName: "사유",
    problemTitle: "이 생각은 어떤 질문에 답하려는가?",
    uncertaintyLabel,
    evidenceHints,
    provenance: createDefaultProvenance({
      source: "fallback",
    }),
    qualityGate: {
      passed: true,
      reasons: [],
    },
  };

  return {
    ...suggestion,
    qualityGate: evaluateSuggestionQualityGate(suggestion),
  };
}

export function applyThoughtNode(
  state: ThoughtSystemData,
  input: AddThoughtInput,
  timestampInput?: string | Date
): {
  nextState: ThoughtSystemData;
  node: ThoughtNode;
  problem: Problem;
  theme: Theme;
  createdRelations: Relation[];
} {
  const timestamp = nowIso(timestampInput);
  const content = normalizeLabel(input.content, "");

  if (!content) {
    throw new Error("Content is required.");
  }

  const suggestion = input.suggestion ?? defaultSuggestion(content);
  const themeResult = ensureTheme(state.themes, suggestion.themeName, timestamp);
  const problemResult = ensureProblem(
    state.problems,
    suggestion.problemTitle,
    input.selectedProblemId,
    timestamp
  );

  const claimsInput = input.claims?.length ? input.claims : createDefaultClaim(content);
  const suggestionEvidenceHints = Array.isArray(suggestion.evidenceHints) ? suggestion.evidenceHints : [];
  const evidenceInput = input.evidence?.length
    ? input.evidence
    : suggestionEvidenceHints.length
      ? suggestionEvidenceHints
      : createDefaultEvidence(content);

  const claims = sanitizeClaims(claimsInput);
  const evidence = sanitizeEvidence(evidenceInput);
  if (suggestion.status === "CONCLUDED" && evidence.length === 0) {
    throw new Error("결론 상태에는 최소 1개의 근거가 필요합니다.");
  }
  const hasEvidenceWarning = suggestion.status === "CONCLUDED" && evidence.length === 0;
  const provenanceBase = normalizeProvenance(input.provenance ?? suggestion.provenance, {
    generatedAt: timestamp,
    source: suggestion.provenance?.source ?? "manual",
  });
  const provenance: ThoughtProvenance = {
    ...provenanceBase,
    userEditedSuggestion: input.userEditedSuggestion ?? provenanceBase.userEditedSuggestion,
    fromNudgeType: input.fromNudgeType ?? provenanceBase.fromNudgeType,
  };

  const createdNode: ThoughtNode = {
    id: createId("node"),
    content,
    status: suggestion.status,
    createdAt: timestamp,
    problemId: problemResult.problem.id,
    themeId: themeResult.theme.id,
    claims,
    evidence,
    provenance,
    hasEvidenceWarning,
  };

  const nextNodes = [createdNode, ...state.nodes];

  const nextProblems = problemResult.problems.map((problem) => {
    if (problem.id !== problemResult.problem.id) return problem;
    return {
      ...problem,
      status: problem.status === "MERGED" ? "OPEN" : problem.status,
      lastThoughtAt: timestamp,
      relatedNodeIds: [createdNode.id, ...problem.relatedNodeIds],
    };
  });

  const createdRelations = createRelationsForNode(createdNode, state.nodes, timestamp);

  return {
    nextState: {
      themes: themeResult.themes,
      problems: nextProblems,
      nodes: nextNodes,
      relations: [...createdRelations, ...state.relations],
    },
    node: createdNode,
    problem: {
      ...problemResult.problem,
      lastThoughtAt: timestamp,
      relatedNodeIds: [createdNode.id, ...problemResult.problem.relatedNodeIds],
    },
    theme: themeResult.theme,
    createdRelations,
  };
}

export function markProblemStatus(
  problems: Problem[],
  problemId: string,
  status: Problem["status"]
): Problem[] {
  return problems.map((problem) =>
    problem.id === problemId
      ? {
          ...problem,
          status,
        }
      : problem
  );
}

export function rankProblems(problems: Problem[]): Problem[] {
  return [...problems].sort((left, right) => {
    const leftTime = new Date(left.lastThoughtAt).getTime();
    const rightTime = new Date(right.lastThoughtAt).getTime();
    return rightTime - leftTime;
  });
}

export function filterNodes(
  nodes: ThoughtNode[],
  query: string,
  statusFilter: ThoughtStatus | "ALL" | "WARNING" | "AI_ONLY"
): ThoughtNode[] {
  const normalizedQuery = query.trim().toLowerCase();

  return nodes.filter((node) => {
    if (statusFilter === "WARNING" && !node.hasEvidenceWarning) {
      return false;
    }

    if (
      statusFilter === "AI_ONLY" &&
      node.provenance.source !== "ai" &&
      node.provenance.source !== "fallback"
    ) {
      return false;
    }

    if (
      statusFilter !== "ALL" &&
      statusFilter !== "WARNING" &&
      statusFilter !== "AI_ONLY" &&
      node.status !== statusFilter
    ) {
      return false;
    }

    if (!normalizedQuery) return true;

    return (
      node.content.toLowerCase().includes(normalizedQuery) ||
      node.status.toLowerCase().includes(normalizedQuery) ||
      node.claims.some((claim) => claim.text.toLowerCase().includes(normalizedQuery)) ||
      node.evidence.some((evidence) => evidence.sourceRef.toLowerCase().includes(normalizedQuery))
    );
  });
}

export function buildStreakData(
  nodes: ThoughtNode[],
  days = 70,
  nowInput?: string | Date
): Array<{ date: string; count: number; intensity: 0 | 1 | 2 | 3 | 4 }> {
  const now = toDate(nowInput);
  const countsByDay = new Map<string, number>();

  for (const node of nodes) {
    const key = dayKey(node.createdAt);
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  const points: Array<{ date: string; count: number }> = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * DAY_MS);
    const key = dayKey(date);
    points.push({
      date: key,
      count: countsByDay.get(key) ?? 0,
    });
  }

  const max = Math.max(1, ...points.map((point) => point.count));

  return points.map((point) => {
    if (!point.count) {
      return {
        ...point,
        intensity: 0,
      };
    }

    const scaled = Math.ceil((point.count / max) * 4) as 1 | 2 | 3 | 4;

    return {
      ...point,
      intensity: scaled,
    };
  });
}

export function findContextNudge(params: {
  content: string;
  nodes: ThoughtNode[];
  problems: Problem[];
  now?: string | Date;
}): ContextNudge | null {
  const { content, nodes, problems, now } = params;
  const normalized = content.trim();

  if (normalized.length < 2) {
    const staleProblem = rankProblems(problems).find((problem) => isProblemStale(problem, now));
    if (!staleProblem) return null;

    const staleDays = daysSince(staleProblem.lastThoughtAt, now);
    return {
      type: "revisit",
      targetProblemId: staleProblem.id,
      message: `${staleDays}일 동안 멈춘 질문이 있어요: ${staleProblem.title}`,
    };
  }

  const linked = nodes
    .map((node) => ({
      node,
      score: similarityScore(normalized, node.content),
    }))
    .filter((item) => item.score >= 0.18)
    .sort((left, right) => right.score - left.score)[0];

  if (linked) {
    return {
      type: "link",
      targetNodeId: linked.node.id,
      targetProblemId: linked.node.problemId,
      message: "이전 생각과 연결될 수 있어요. 관계를 확인해볼까요?",
    };
  }

  return null;
}

export function updateThoughtNode(
  state: ThoughtSystemData,
  params: {
    nodeId: string;
    content: string;
    status: ThoughtStatus;
    claims?: ThoughtClaim[];
    evidence?: ThoughtEvidence[];
    provenance?: ThoughtProvenance;
  },
  timestampInput?: string | Date
): { nextState: ThoughtSystemData; updatedNode: ThoughtNode; relationsCreated: Relation[] } {
  const timestamp = nowIso(timestampInput);
  const nextContent = normalizeLabel(params.content, "");

  if (!nextContent) {
    throw new Error("Node content is required.");
  }

  if (!THOUGHT_STATUS.includes(params.status)) {
    throw new Error("Invalid thought status.");
  }

  const existing = state.nodes.find((node) => node.id === params.nodeId);
  if (!existing) {
    throw new Error("Node not found.");
  }

  const baseClaims = existing.claims?.length ? existing.claims : createDefaultClaim(existing.content);
  const baseEvidence = Array.isArray(existing.evidence) ? existing.evidence : [];
  const nextClaims = sanitizeClaims(params.claims?.length ? params.claims : baseClaims);
  const nextEvidence = sanitizeEvidence(params.evidence ?? baseEvidence);
  if (params.status === "CONCLUDED" && nextEvidence.length === 0) {
    throw new Error("결론 상태에는 최소 1개의 근거가 필요합니다.");
  }
  const provenanceInput =
    params.provenance ??
    existing.provenance ??
    createDefaultProvenance({ generatedAt: existing.createdAt, source: "manual" });
  const nextProvenance = normalizeProvenance(provenanceInput, {
    generatedAt: timestamp,
    source: provenanceInput.source,
  });
  const nextWarning = params.status === "CONCLUDED" && nextEvidence.length === 0;

  const updatedNode: ThoughtNode = {
    ...existing,
    content: nextContent,
    status: params.status,
    claims: nextClaims,
    evidence: nextEvidence,
    provenance: nextProvenance,
    hasEvidenceWarning: nextWarning,
  };

  const nextNodes = state.nodes.map((node) => (node.id === params.nodeId ? updatedNode : node));

  const preservedRelations = state.relations.filter(
    (relation) =>
      relation.sourceNodeId !== params.nodeId && relation.targetNodeId !== params.nodeId
  );
  const relationsCreated = createRelationsForNode(updatedNode, nextNodes, timestamp);

  const nextProblems = state.problems.map((problem) =>
    problem.id === updatedNode.problemId
      ? {
          ...problem,
          lastThoughtAt: timestamp,
        }
      : problem
  );

  return {
    nextState: {
      ...state,
      nodes: nextNodes,
      problems: nextProblems,
      relations: [...relationsCreated, ...preservedRelations],
    },
    updatedNode,
    relationsCreated,
  };
}

export function createProblem(
  problems: Problem[],
  title: string,
  timestampInput?: string | Date
): { problems: Problem[]; problem: Problem } {
  const timestamp = nowIso(timestampInput);
  const normalizedTitle = normalizeLabel(title, "새로운 질문은 무엇일까?");
  const existing = problems.find(
    (problem) => problem.title.toLowerCase() === normalizedTitle.toLowerCase()
  );

  if (existing) {
    return {
      problems,
      problem: existing,
    };
  }

  const created: Problem = {
    id: createId("problem"),
    title: normalizedTitle,
    status: "OPEN",
    createdAt: timestamp,
    lastThoughtAt: timestamp,
    relatedNodeIds: [],
  };

  return {
    problems: [created, ...problems],
    problem: created,
  };
}

export function renameProblem(
  problems: Problem[],
  problemId: string,
  title: string
): Problem[] {
  const normalizedTitle = normalizeLabel(title, "새로운 질문은 무엇일까?");
  return problems.map((problem) =>
    problem.id === problemId
      ? {
          ...problem,
          title: normalizedTitle,
        }
      : problem
  );
}

function latestThoughtAtByProblem(nodes: ThoughtNode[], problemId: string, fallback: string): string {
  const targets = nodes.filter((node) => node.problemId === problemId);
  if (!targets.length) return fallback;

  return [...targets]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
    .createdAt;
}

export function removeThoughtNode(
  state: ThoughtSystemData,
  nodeId: string
): { nextState: ThoughtSystemData; removedNode: ThoughtNode } {
  const removedNode = state.nodes.find((node) => node.id === nodeId);
  if (!removedNode) {
    throw new Error("Node not found.");
  }

  const nextNodes = state.nodes.filter((node) => node.id !== nodeId);
  const nextRelations = state.relations.filter(
    (relation) => relation.sourceNodeId !== nodeId && relation.targetNodeId !== nodeId
  );

  const nextProblems = state.problems.map((problem) => {
    if (problem.id !== removedNode.problemId) {
      return problem;
    }

    const remainingNodeIds = problem.relatedNodeIds.filter((id) => id !== nodeId);
    const lastThoughtAt = latestThoughtAtByProblem(nextNodes, problem.id, problem.createdAt);

    return {
      ...problem,
      relatedNodeIds: remainingNodeIds,
      lastThoughtAt,
      status: remainingNodeIds.length ? problem.status : "PENDING",
    };
  });

  return {
    nextState: {
      themes: state.themes,
      problems: nextProblems,
      nodes: nextNodes,
      relations: nextRelations,
    },
    removedNode,
  };
}

export function removeProblem(
  state: ThoughtSystemData,
  problemId: string
): { nextState: ThoughtSystemData; removedProblem: Problem } {
  const removedProblem = state.problems.find((problem) => problem.id === problemId);
  if (!removedProblem) {
    throw new Error("Problem not found.");
  }

  const nextProblems = state.problems.filter((problem) => problem.id !== problemId);
  const removedNodeIds = new Set(
    state.nodes.filter((node) => node.problemId === problemId).map((node) => node.id)
  );

  const nextNodes = state.nodes.filter((node) => !removedNodeIds.has(node.id));
  const nextRelations = state.relations.filter(
    (relation) => !removedNodeIds.has(relation.sourceNodeId) && !removedNodeIds.has(relation.targetNodeId)
  );

  const usedThemeIds = new Set(nextNodes.map((node) => node.themeId));
  const nextThemes = state.themes.filter((theme) => usedThemeIds.has(theme.id));

  return {
    nextState: {
      themes: nextThemes.length ? nextThemes : state.themes,
      problems: nextProblems,
      nodes: nextNodes,
      relations: nextRelations,
    },
    removedProblem,
  };
}

export function exportThoughtSystemData(data: ThoughtSystemData): string {
  return JSON.stringify(data, null, 2);
}

function computeProblemLinks(nodes: ThoughtNode[], problems: Problem[]): Problem[] {
  const idsByProblem = new Map<string, string[]>();
  for (const node of nodes) {
    const current = idsByProblem.get(node.problemId) ?? [];
    idsByProblem.set(node.problemId, [node.id, ...current]);
  }

  return problems.map((problem) => ({
    ...problem,
    relatedNodeIds: idsByProblem.get(problem.id) ?? [],
  }));
}

export function parseThoughtSystemData(raw: string): { ok: true; data: ThoughtSystemData } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isObject(parsed)) {
      return { ok: false, error: "JSON object 형태가 아닙니다." };
    }

    const themesRaw = parsed.themes;
    const problemsRaw = parsed.problems;
    const nodesRaw = parsed.nodes;
    const relationsRaw = parsed.relations;

    if (!Array.isArray(themesRaw) || !Array.isArray(problemsRaw) || !Array.isArray(nodesRaw) || !Array.isArray(relationsRaw)) {
      return { ok: false, error: "themes/problems/nodes/relations 배열이 필요합니다." };
    }

    const themes: Theme[] = [];
    for (const item of themesRaw) {
      if (!isObject(item) || typeof item.id !== "string" || typeof item.name !== "string") {
        return { ok: false, error: "theme 포맷이 올바르지 않습니다." };
      }
      themes.push({
        id: item.id,
        name: normalizeLabel(item.name, "기타"),
        createdAt: typeof item.createdAt === "string" ? item.createdAt : nowIso(),
      });
    }

    const problems: Problem[] = [];
    for (const item of problemsRaw) {
      if (!isObject(item) || typeof item.id !== "string" || typeof item.title !== "string") {
        return { ok: false, error: "problem 포맷이 올바르지 않습니다." };
      }

      const status = typeof item.status === "string" && isProblemStatus(item.status) ? item.status : "OPEN";
      const relatedNodeIds =
        Array.isArray(item.relatedNodeIds) && item.relatedNodeIds.every((id) => typeof id === "string")
          ? item.relatedNodeIds
          : [];

      problems.push({
        id: item.id,
        title: normalizeLabel(item.title, "지금의 고민은 무엇일까?"),
        status,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : nowIso(),
        lastThoughtAt: typeof item.lastThoughtAt === "string" ? item.lastThoughtAt : nowIso(),
        relatedNodeIds,
      });
    }

    const nodes: ThoughtNode[] = [];
    for (const item of nodesRaw) {
      if (
        !isObject(item) ||
        typeof item.id !== "string" ||
        typeof item.content !== "string" ||
        typeof item.problemId !== "string" ||
        typeof item.themeId !== "string"
      ) {
        return { ok: false, error: "node 포맷이 올바르지 않습니다." };
      }

      const status = typeof item.status === "string" && isThoughtStatus(item.status) ? item.status : "DRAFT";
      const claimsRaw = Array.isArray(item.claims) ? item.claims : [];
      const claims = claimsRaw
        .filter(
          (claim): claim is ThoughtClaim =>
            isObject(claim) &&
            typeof claim.id === "string" &&
            typeof claim.text === "string" &&
            typeof claim.confidence === "number"
        )
        .map((claim) =>
          normalizeClaim({
            id: claim.id,
            text: claim.text,
            confidence: claim.confidence,
            supports: Array.isArray(claim.supports)
              ? claim.supports.filter((id): id is string => typeof id === "string")
              : [],
            attacks: Array.isArray(claim.attacks)
              ? claim.attacks.filter((id): id is string => typeof id === "string")
              : [],
          })
        );

      const evidenceRaw = Array.isArray(item.evidence) ? item.evidence : [];
      const evidence = evidenceRaw
        .filter(
          (evidence): evidence is ThoughtEvidence =>
            isObject(evidence) &&
            typeof evidence.id === "string" &&
            typeof evidence.sourceRef === "string" &&
            typeof evidence.relevance === "number" &&
            typeof evidence.type === "string"
        )
        .map((evidence) =>
          normalizeEvidence({
            id: evidence.id,
            type: evidence.type,
            sourceRef: evidence.sourceRef,
            relevance: evidence.relevance,
          })
        );

      const provenance = isObject(item.provenance)
        ? normalizeProvenance(
            {
              analyzerVersion:
                typeof item.provenance.analyzerVersion === "string"
                  ? item.provenance.analyzerVersion
                  : "manual-v1",
              promptHash:
                typeof item.provenance.promptHash === "string"
                  ? item.provenance.promptHash
                  : "manual",
              retrievalIds:
                Array.isArray(item.provenance.retrievalIds) &&
                item.provenance.retrievalIds.every((id) => typeof id === "string")
                  ? item.provenance.retrievalIds
                  : [],
              generatedAt:
                typeof item.provenance.generatedAt === "string"
                  ? item.provenance.generatedAt
                  : nowIso(),
              source:
                item.provenance.source === "ai" ||
                item.provenance.source === "manual" ||
                item.provenance.source === "fallback"
                  ? item.provenance.source
                  : "manual",
              userEditedSuggestion: Boolean(item.provenance.userEditedSuggestion),
              fromNudgeType:
                item.provenance.fromNudgeType === "link" || item.provenance.fromNudgeType === "revisit"
                  ? item.provenance.fromNudgeType
                  : null,
            },
            { generatedAt: nowIso() }
          )
        : createDefaultProvenance({ generatedAt: nowIso(), source: "manual" });

      const fallbackClaims = claims.length ? claims : createDefaultClaim(item.content);
      const repairedClaims = sanitizeClaims(fallbackClaims);
      const repairedEvidence = sanitizeEvidence(evidence);
      const hasEvidenceWarning =
        typeof item.hasEvidenceWarning === "boolean"
          ? item.hasEvidenceWarning
          : status === "CONCLUDED" && repairedEvidence.length === 0;

      nodes.push({
        id: item.id,
        content: normalizeLabel(item.content, ""),
        status,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : nowIso(),
        problemId: item.problemId,
        themeId: item.themeId,
        claims: repairedClaims,
        evidence: repairedEvidence,
        provenance,
        hasEvidenceWarning,
      });
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const relations: Relation[] = [];
    for (const item of relationsRaw) {
      if (
        !isObject(item) ||
        typeof item.id !== "string" ||
        typeof item.sourceNodeId !== "string" ||
        typeof item.targetNodeId !== "string" ||
        !nodeIds.has(item.sourceNodeId) ||
        !nodeIds.has(item.targetNodeId)
      ) {
        continue;
      }

      const relationType =
        typeof item.relationType === "string" && isRelationType(item.relationType)
          ? item.relationType
          : "PARALLEL";

      relations.push({
        id: item.id,
        sourceNodeId: item.sourceNodeId,
        targetNodeId: item.targetNodeId,
        relationType,
        score: typeof item.score === "number" ? item.score : 0,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : nowIso(),
      });
    }

    const repairedProblems = computeProblemLinks(nodes, problems);

    return {
      ok: true,
      data: {
        themes,
        problems: repairedProblems,
        nodes,
        relations,
      },
    };
  } catch {
    return { ok: false, error: "JSON 파싱에 실패했습니다." };
  }
}

export interface QualityMetrics {
  evidenceCoverage: number;
  hallucinationProxy: number;
  overrideRate: number;
  reflectionCompletionRate: number;
  concludedCount: number;
  aiGeneratedCount: number;
  warningCount: number;
}

function safeRatio(numerator: number, denominator: number, fallback: number): number {
  if (!denominator) return fallback;
  return clampScore(numerator / denominator, fallback);
}

export function calculateQualityMetrics(
  nodes: ThoughtNode[],
  problems: Problem[],
  nowInput?: string | Date
): QualityMetrics {
  const concluded = nodes.filter((node) => node.status === "CONCLUDED");
  const evidenceCovered = concluded.filter((node) => node.evidence.length > 0);
  const warnings = concluded.filter((node) => node.hasEvidenceWarning || node.evidence.length === 0);
  const aiNodes = nodes.filter(
    (node) => node.provenance.source === "ai" || node.provenance.source === "fallback"
  );
  const overrideNodes = aiNodes.filter((node) => node.provenance.userEditedSuggestion);
  const openProblems = problems.filter((problem) => problem.status === "OPEN");
  const recentReflections = openProblems.filter(
    (problem) => hoursSince(problem.lastThoughtAt, nowInput) <= RECENT_REFLECTION_HOURS
  );

  return {
    evidenceCoverage: safeRatio(evidenceCovered.length, concluded.length, 1),
    hallucinationProxy: safeRatio(warnings.length, concluded.length, 0),
    overrideRate: safeRatio(overrideNodes.length, aiNodes.length, 0),
    reflectionCompletionRate: safeRatio(recentReflections.length, openProblems.length, 1),
    concludedCount: concluded.length,
    aiGeneratedCount: aiNodes.length,
    warningCount: warnings.length,
  };
}

export function relationTypeLabel(type: RelationType): string {
  switch (type) {
    case "EXTENSION":
      return "확장";
    case "REFUTATION":
      return "반박";
    case "REVISION":
      return "수정";
    case "PARALLEL":
      return "병렬";
    default:
      return type;
  }
}
