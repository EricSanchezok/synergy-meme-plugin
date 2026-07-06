import { tool } from "@ericsanchezok/synergy-plugin/tool";
import { templates } from "../data/templates.generated";
import type { MemeTemplate } from "../data/types";
import {
  templateProfiles,
  type MemeTemplateProfile,
} from "../data/template-profiles";
import {
  documentTokens,
  queryTokens as tokenQueryTokens,
} from "./search-tokenizer";

// ---- Types ----

export interface MemeTemplateSearchInput {
  query?: string;
  limit?: number;
  lineCount?: number;
  style?: string;
  minLines?: number;
}

// ---- Constants ----

const classicTemplateIds = [
  "drake",
  "fine",
  "facepalm",
  "success",
  "gb",
  "rollsafe",
  "fry",
  "harold",
  "disastergirl",
  "scc",
  "astronaut",
  "awkward",
  "gru",
];

const supportedStyles = new Set(
  templates.flatMap((t) => t.styles.map(normalize)),
);

const RANDOM_REQUEST_RE = /随机|随便|任意|random|whatever|surprise/i;
let randomSelectionIndex = 0;

// ---- Anchor tags: bridge from query expansion vocab to template matching ----
// Included for all templates. Profile tags provide distinctive semantic identity;
// anchor tags provide the query-expansion-to-template bridge (e.g. "developer"
// "debug" "semicolon") that profile tags deliberately avoid.

const templateAnchorTags: Record<string, string[]> = {
  astronaut: ["realization", "reveal", "always", "truth", "debug"],
  awkward: ["awkward", "mistake", "social", "pain"],
  badchoice: [
    "choice",
    "mistake",
    "regret",
    "consequence",
    "expectation",
    "reality",
    "underestimate",
    "pain",
    "work",
    "scope",
  ],
  crazypills: [
    "panic",
    "frustrated",
    "confused",
    "rage",
    "disaster",
    "fire",
    "deploy",
    "production",
    "failure",
    "insane",
  ],
  cryingfloor: ["cry", "pain", "failure", "dramatic"],
  db: ["choice", "contrast", "distracted", "temptation"],
  dbg: ["choice", "contrast", "distracted", "temptation"],
  disastergirl: ["disaster", "fire", "chaos", "success"],
  doge: ["dog", "weird", "confused", "classic"],
  drake: ["choice", "contrast", "old", "new", "prefer", "classic"],
  drowning: ["ignored", "problem", "help", "priority"],
  dwight: ["office", "work", "fact", "deadpan"],
  ermg: ["panic", "excited", "surprised", "error"],
  facepalm: [
    "developer",
    "debug",
    "bug",
    "mistake",
    "semicolon",
    "frustrated",
    "obvious",
  ],
  feelsgood: ["success", "relief", "happy", "good"],
  fine: [
    "panic",
    "stress",
    "fire",
    "disaster",
    "pretend",
    "developer",
    "debug",
    "classic",
  ],
  firsttry: ["success", "lucky", "unexpected", "win"],
  fry: [
    "confused",
    "unsure",
    "debug",
    "bug",
    "question",
    "realization",
    "ambiguity",
    "uncertainty",
    "suspicion",
    "clarity",
  ],
  gandalf: ["confused", "lost", "question"],
  gb: ["brain", "complexity", "escalation", "plan", "idea", "classic"],
  gru: [
    "plan",
    "mistake",
    "backfire",
    "steps",
    "expectation",
    "reality",
    "underestimate",
    "product",
    "scope",
    "change",
    "overconfidence",
    "collapse",
    "pain",
    "work",
  ],
  handshake: ["agreement", "same", "common-ground"],
  harold: ["pain", "pretend", "smile", "developer", "debug"],
  headaches: ["stress", "pain", "debug", "problem"],
  interesting: ["confidence", "claim", "rare"],
  iw: ["rage", "extreme", "chaos"],
  morpheus: ["truth", "realization", "what-if"],
  noidea: [
    "dog",
    "confused",
    "developer",
    "lost",
    "debug",
    "code",
    "uncertainty",
    "ambiguity",
  ],
  rollsafe: ["clever", "hack", "idea", "smart"],
  sadfrog: ["sad", "pain", "failure"],
  scc: [
    "realization",
    "clarity",
    "finally",
    "debug",
    "bug",
    "semicolon",
    "relief",
  ],
  sf: ["success", "relief", "fixed", "win"],
  spongebob: ["mocking", "sarcasm", "silly"],
  stonks: ["success", "money", "win", "absurd"],
  success: ["success", "relief", "finally", "fixed", "win", "classic"],
  wonka: ["sarcasm", "skeptical"],
  yuno: ["why", "frustrated", "question"],
};

// ---- BM25 parameters ----

const BM25_K1 = 1.2;
const BM25_B = 0.75;
const BM25_WEIGHT = 10;

// ---- Utilities ----

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKC").trim();
}

function hashScore(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

// ---- Template search document ----

function templateSearchDocument(t: MemeTemplate): string[] {
  const profile: MemeTemplateProfile | undefined = templateProfiles[t.id];
  const anchorTags = templateAnchorTags[t.id] ?? [];
  return [
    t.id,
    t.name,
    ...t.keywords,
    ...t.styles,
    t.source ?? "",
    ...(profile?.tags ?? []),
    ...anchorTags,
    ...(profile?.aliases ?? []),
    ...(profile?.bestFor ?? []),
    ...(profile?.examples ?? []),
  ];
}

// ---- BM25 index ----

interface Bm25Index {
  docLengths: Map<string, number>;
  termFreqs: Map<string, Map<string, number>>;
  docFreq: Map<string, number>;
  avgDocLen: number;
  docCount: number;
}

let bm25Index: Bm25Index | null = null;

function buildBm25Index(): Bm25Index {
  const docLengths = new Map<string, number>();
  const termFreqs = new Map<string, Map<string, number>>();
  const docFreq = new Map<string, number>();
  let totalLen = 0;

  for (const t of templates) {
    const tokens = documentTokens(templateSearchDocument(t).join(" "));
    docLengths.set(t.id, tokens.length);
    totalLen += tokens.length;

    const tf = new Map<string, number>();
    const seen = new Set<string>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
      seen.add(token);
    }
    termFreqs.set(t.id, tf);
    for (const token of seen) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }

  return {
    docLengths,
    termFreqs,
    docFreq,
    avgDocLen: totalLen / Math.max(1, templates.length),
    docCount: templates.length,
  };
}

function getBm25Index(): Bm25Index {
  if (!bm25Index) bm25Index = buildBm25Index();
  return bm25Index;
}

function bm25Score(templateId: string, queryTerms: string[]): number {
  const idx = getBm25Index();
  const docLen = idx.docLengths.get(templateId) ?? 1;
  const tf = idx.termFreqs.get(templateId);
  if (!tf) return 0;

  let score = 0;
  for (const term of queryTerms) {
    const df = idx.docFreq.get(term);
    if (!df || df === 0) continue;
    const termFreq = tf.get(term) ?? 0;
    if (termFreq === 0) continue;

    const idf = Math.log((idx.docCount - df + 0.5) / (df + 0.5) + 1);
    const numerator = termFreq * (BM25_K1 + 1);
    const denominator =
      termFreq + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / idx.avgDocLen));
    score += idf * (numerator / denominator);
  }

  return score;
}

// ---- Template guidance (bestFor display) ----

function templateGuidance(t: MemeTemplate): string {
  const profile = templateProfiles[t.id];
  if (profile?.bestFor?.length) return profile.bestFor[0];
  const tags = profile?.tags ?? t.keywords;
  if (tags.length) return tags.slice(0, 8).join(", ");
  return "general reaction meme";
}

// ---- Line fit ----

function lineFitScore(t: MemeTemplate, lineCount?: number): number {
  if (!lineCount) return 0;
  if (t.lines === lineCount) return 24;
  if (t.lines > lineCount) return Math.max(2, 8 - (t.lines - lineCount) * 2);
  return -Math.min(18, (lineCount - t.lines) * 6);
}

// ---- Retained business boosts ----

function retainedBusinessBoosts(t: MemeTemplate, tokens: string[]): number {
  let score = 0;

  // Classic preference — very small
  if (tokens.includes("classic") && classicTemplateIds.includes(t.id))
    score += 5;

  // Developer root-cause discovery — small push toward insight templates
  if (
    tokens.includes("developer") &&
    tokens.includes("realization") &&
    tokens.includes("relief") &&
    ["scc", "facepalm"].includes(t.id)
  ) {
    score += 6;
  }

  // Production disaster — small push for disastergirl when disaster tokens present
  if (
    (tokens.includes("disaster") || tokens.includes("fire")) &&
    t.id === "disastergirl"
  ) {
    score += 5;
  }

  // Scope-creep / product expectation — push gru and badchoice
  if (
    (tokens.includes("expectation") ||
      tokens.includes("reality") ||
      tokens.includes("change")) &&
    (tokens.includes("work") ||
      tokens.includes("product") ||
      tokens.includes("scope") ||
      tokens.includes("pain"))
  ) {
    if (["gru", "badchoice"].includes(t.id)) score += 6;
  }

  // Production chaos gaslighting — push crazypills
  if (
    (tokens.includes("disaster") ||
      tokens.includes("fire") ||
      tokens.includes("production") ||
      tokens.includes("deploy")) &&
    (tokens.includes("confused") ||
      tokens.includes("frustrated") ||
      tokens.includes("panic"))
  ) {
    if (t.id === "crazypills") score += 5;
  }

  // Ambiguous understanding — push fry
  if (
    tokens.includes("question") &&
    (tokens.includes("confused") ||
      tokens.includes("realization") ||
      tokens.includes("awkward") ||
      tokens.includes("clarity"))
  ) {
    if (t.id === "fry") score += 5;
  }

  return score;
}

// ---- Exact field match (reduced scope) ----

function exactFieldMatchScore(t: MemeTemplate, query: string): number {
  const q = normalize(query);
  if (q.length < 4) return 0;

  let score = 0;
  for (const text of [
    t.id,
    t.name,
    ...t.keywords,
    ...t.styles,
    t.source ?? "",
  ]) {
    if (!text) continue;
    if (normalize(text) === q) score += 40;
    else if (normalize(text).includes(q)) score += 8;
  }
  return score;
}

// ---- Scoring ----

export function scoreTemplate(t: MemeTemplate, query: string): number {
  const q = normalize(query);
  if (!q) return classicTemplateIds.includes(t.id) ? 2 : 1;

  const tokens = tokenQueryTokens(q);
  let score = 0;

  // Exact id/name
  if (normalize(t.id) === q) score += 120;
  if (normalize(t.name) === q) score += 100;

  // Classic subtle bias
  if (classicTemplateIds.includes(t.id)) score += 1;

  // BM25 main relevance
  score += bm25Score(t.id, tokens) * BM25_WEIGHT;

  // Field match
  score += exactFieldMatchScore(t, q);

  // Retained boosts
  score += retainedBusinessBoosts(t, tokens);

  // Random jitter
  if (tokens.includes("random")) score += hashScore(`${q}:${t.id}`) * 4;

  return score;
}

// ---- Ranking ----

export function rankMemeTemplates(input: MemeTemplateSearchInput) {
  const limit = input.limit ?? 12;
  const style = input.style ? normalize(input.style) : undefined;
  const styleFilter = style && supportedStyles.has(style) ? style : undefined;
  const query = [input.query ?? "", style && !styleFilter ? style : ""]
    .filter(Boolean)
    .join(" ");

  return templates
    .filter((t) => (input.minLines ? t.lines >= input.minLines : true))
    .filter((t) =>
      styleFilter ? t.styles.map(normalize).includes(styleFilter) : true,
    )
    .map((t) => ({
      template: t,
      score: scoreTemplate(t, query) + lineFitScore(t, input.lineCount),
    }))
    .filter((entry) => !query || entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        hashScore(`${query}:${b.template.id}`) -
          hashScore(`${query}:${a.template.id}`),
    )
    .slice(0, limit);
}

export function findMemeTemplates(input: MemeTemplateSearchInput) {
  return rankMemeTemplates(input).map(({ template }) => template);
}

export function selectMemeTemplate(
  input: Omit<MemeTemplateSearchInput, "limit">,
): MemeTemplate | undefined {
  const matches = findMemeTemplates({
    ...input,
    limit: isRandomMemeRequest(input.query) ? 8 : 1,
  });
  if (isRandomMemeRequest(input.query) && matches.length > 0) {
    const match = matches[randomSelectionIndex % matches.length];
    randomSelectionIndex++;
    return match;
  }
  const [match] = matches;
  if (match) return match;

  const fallback = [...classicTemplateIds].sort(
    (a, b) =>
      hashScore(`${input.query ?? ""}:${b}`) -
      hashScore(`${input.query ?? ""}:${a}`),
  );
  for (const id of fallback) {
    const t = templates.find((item) => item.id === id);
    if (!t) continue;
    if (input.minLines && t.lines < input.minLines) continue;
    if (
      input.style &&
      !t.styles.map(normalize).includes(normalize(input.style))
    )
      continue;
    return t;
  }

  return templates.find((t) => {
    if (input.minLines && t.lines < input.minLines) return false;
    if (
      input.style &&
      !t.styles.map(normalize).includes(normalize(input.style))
    )
      return false;
    return true;
  });
}

// ---- Random request detection ----

export function isRandomMemeRequest(query: string | undefined): boolean {
  return !!query && RANDOM_REQUEST_RE.test(query);
}

// ---- Candidate keywords ----

function candidateKeywords(t: MemeTemplate): string[] {
  const profile = templateProfiles[t.id];
  return [...new Set([...(profile?.tags ?? []), ...t.keywords])].slice(0, 10);
}

// ---- Internal tool ----

export const searchMemeTemplates = tool({
  description:
    "Search bundled meme templates by id, name, keyword, style, or line count.",
  exposure: { mode: "internal" } as any,
  args: {
    query: tool.schema
      .string()
      .optional()
      .describe("Search text, for example drake, distracted, brain, choice."),
    limit: tool.schema
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of templates to return."),
    lineCount: tool.schema
      .number()
      .int()
      .min(1)
      .max(8)
      .optional()
      .describe(
        "Prefer templates supporting this number of caption lines. Results may include nearby fits.",
      ),
    style: tool.schema
      .string()
      .optional()
      .describe("Only return templates supporting this style."),
  },
  async execute(args) {
    const matches = rankMemeTemplates(args).map(({ template, score }) => ({
      id: template.id,
      name: template.name,
      lines: template.lines,
      styles: template.styles,
      score: Number(score.toFixed(2)),
      bestFor: templateGuidance(template),
      keywords: candidateKeywords(template),
      fit: args.lineCount
        ? template.lines === args.lineCount
          ? "exact"
          : template.lines > args.lineCount
            ? "supports-extra-lines"
            : "fewer-lines"
        : "unspecified",
    }));

    return {
      title: "Meme templates",
      output: JSON.stringify(
        {
          guidance: isRandomMemeRequest(args.query)
            ? "The request is open-ended. Pick a recognizable candidate that has not been overused in the current conversation; do not always choose the first result."
            : "Pick the candidate whose keywords and line count best match the user's intent.",
          candidates: matches,
        },
        null,
        2,
      ),
      metadata: {
        query: args.query ?? "",
        count: matches.length,
        totalTemplates: templates.length,
      },
    };
  },
});
