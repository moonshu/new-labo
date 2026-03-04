import type {
  AddThoughtInput,
  AISuggestion,
  ContextNudge,
  Problem,
  Relation,
  RelationType,
  Theme,
  ThoughtNode,
  ThoughtSystemData,
  ThoughtStatus,
} from "@/types/thought";

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_HOURS = 72;

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

export function formatKoreanDate(input: string | Date): string {
  const date = toDate(input);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
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
    },
    {
      id: "node_2",
      content: "질문을 먼저 적고 생각을 이어붙이면 흐름이 끊기지 않는다.",
      status: "HESITATED",
      createdAt: at(12),
      problemId: "problem_core",
      themeId: "theme_writing",
    },
    {
      id: "node_3",
      content: "정답을 쓰는 앱보다 변화 기록이 남는 앱이 더 오래 쓰인다.",
      status: "CONCLUDED",
      createdAt: at(4),
      problemId: "problem_core",
      themeId: "theme_writing",
    },
    {
      id: "node_4",
      content: "오늘 기록량보다 질문을 다시 붙잡은 횟수가 더 중요한 지표다.",
      status: "HESITATED",
      createdAt: at(8),
      problemId: "problem_stale",
      themeId: "theme_productivity",
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

export function defaultSuggestion(content: string): AISuggestion {
  const normalized = normalizeLabel(content, "");

  const status: ThoughtStatus = /\?|왜|어떻게|모르/.test(normalized)
    ? "DRAFT"
    : /아마|일단|아직|불확실/.test(normalized)
      ? "HESITATED"
      : "CONCLUDED";

  return {
    status,
    themeName: "사유",
    problemTitle: "이 생각은 어떤 질문에 답하려는가?",
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

  const createdNode: ThoughtNode = {
    id: createId("node"),
    content,
    status: suggestion.status,
    createdAt: timestamp,
    problemId: problemResult.problem.id,
    themeId: themeResult.theme.id,
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
