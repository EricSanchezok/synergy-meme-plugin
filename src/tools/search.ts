import { tool } from "@ericsanchezok/synergy-plugin/tool"
import { templates } from "../data/templates.generated"
import type { MemeTemplate } from "../data/types"

export interface MemeTemplateSearchInput {
  query?: string
  limit?: number
  lineCount?: number
  style?: string
  minLines?: number
}

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKC").trim()
}

function asciiTokens(value: string) {
  return normalize(value).match(/[a-z0-9]+/g) ?? []
}

const queryExpansions: Array<{ match: RegExp; tokens: string[] }> = [
  {
    match:
      /程序员|开发|代码|编程|软件|工程师|debug|调试|bug|错误|报错|分号|semicolon|programmer|developer|coding|code/i,
    tokens: [
      "developer",
      "programming",
      "code",
      "debug",
      "bug",
      "mistake",
      "confused",
    ],
  },
  {
    match: /崩溃|爆炸|抓狂|绝望|破防|裂开|panic|crash|breakdown|rage|stress/i,
    tokens: ["panic", "stress", "pain", "frustrated", "disaster", "fire"],
  },
  {
    match:
      /释然|解决|修好|终于|原来|恍然大悟|成功|爽|win|success|fixed|finally|relief/i,
    tokens: ["success", "relief", "finally", "realization", "happy", "good"],
  },
  {
    match: /困惑|不懂|迷茫|懵|confused|lost|what|why/i,
    tokens: ["confused", "lost", "unsure", "question", "what"],
  },
  {
    match: /懂|明白|理解|看懂|没完全|似懂非懂|原来如此|i see|understand/i,
    tokens: ["realization", "confused", "awkward", "question", "clarity"],
  },
  {
    match: /选择|对比|相比|以前|现在|旧|新|vs|versus|choice|prefer/i,
    tokens: ["choice", "contrast", "old", "new", "prefer"],
  },
  {
    match:
      /老板|经理|产品|需求|客户|甲方|改了|改需求|变更|scope|requirement|product|manager|client/i,
    tokens: ["work", "product", "change", "backfire", "stress", "mistake"],
  },
  {
    match:
      /简单|很快|五分钟|一天|三天|半天|以为|实际|easy|simple|quick|expectation|reality/i,
    tokens: ["expectation", "reality", "underestimate", "pain", "work"],
  },
  {
    match:
      /上线|部署|生产|线上|监控|告警|报警|全红|ci|build|deploy|production|monitor|alert/i,
    tokens: [
      "deploy",
      "production",
      "failure",
      "disaster",
      "fire",
      "panic",
      "debug",
    ],
  },
  {
    match: /脑洞|升级|越来越|复杂|架构|plan|brain|smart|clever|complex/i,
    tokens: ["brain", "complexity", "plan", "clever", "escalation"],
  },
  {
    match: /尴尬|假装|微笑|awkward|pretend|smile|pain/i,
    tokens: ["awkward", "pain", "pretend", "smile"],
  },
  {
    match: /狗|狗狗|柴犬|dog|doge|puppy/i,
    tokens: ["dog", "doge", "confused"],
  },
  {
    match: /随机|随便|任意|random|whatever|surprise/i,
    tokens: ["classic", "random"],
  },
]

const templateSemantics: Record<string, string[]> = {
  astronaut: ["realization", "reveal", "always", "truth", "debug"],
  awkward: ["awkward", "mistake", "social", "pain"],
  badchoice: ["choice", "mistake", "regret", "consequence"],
  crazypills: ["panic", "frustrated", "confused", "rage"],
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
  fry: ["confused", "unsure", "debug", "bug", "question"],
  gandalf: ["confused", "lost", "question"],
  gb: ["brain", "complexity", "escalation", "plan", "idea", "classic"],
  gru: ["plan", "mistake", "backfire", "steps"],
  handshake: ["agreement", "same", "common-ground"],
  harold: ["pain", "pretend", "smile", "developer", "debug"],
  headaches: ["stress", "pain", "debug", "problem"],
  interesting: ["confidence", "claim", "rare"],
  iw: ["rage", "extreme", "chaos"],
  morpheus: ["truth", "realization", "what-if"],
  noidea: ["dog", "confused", "developer", "lost", "debug", "code"],
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
}

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
]

const supportedStyles = new Set(templates.flatMap((template) => template.styles.map(normalize)))
const RANDOM_REQUEST_RE = /随机|随便|任意|random|whatever|surprise/i
let randomSelectionIndex = 0

function templateGuidance(template: MemeTemplate) {
  const semantics = templateSemantics[template.id] ?? []
  const signals = [...new Set([...semantics, ...template.keywords.flatMap(asciiTokens)])]
    .filter(Boolean)
    .slice(0, 8)
  if (signals.length === 0) return "general reaction meme"
  return signals.join(", ")
}

function queryTokens(query: string) {
  const normalized = normalize(query)
  const tokens = new Set(asciiTokens(normalized))
  let matchedExpansion = false
  for (const expansion of queryExpansions) {
    if (!expansion.match.test(query)) continue
    matchedExpansion = true
    for (const token of expansion.tokens) tokens.add(token)
  }
  if (normalized && tokens.size === 0 && !matchedExpansion) {
    tokens.add("classic")
    tokens.add("random")
  }
  return [...tokens]
}

export function isRandomMemeRequest(query: string | undefined): boolean {
  return !!query && RANDOM_REQUEST_RE.test(query)
}

function templateTokens(template: MemeTemplate) {
  return new Set([
    ...asciiTokens(template.id),
    ...asciiTokens(template.name),
    ...template.keywords.flatMap(asciiTokens),
    ...template.styles.flatMap(asciiTokens),
    ...(template.source ? asciiTokens(template.source) : []),
    ...(templateSemantics[template.id] ?? []),
  ])
}

function hashScore(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 0xffffffff
}

function exactTokenScore(tokens: Set<string>, token: string) {
  if (tokens.has(token)) return 8
  if (token.length < 4) return 0
  for (const item of tokens) {
    if (item.includes(token) || token.includes(item)) return 3
  }
  return 0
}

function templateBoost(template: MemeTemplate, tokens: string[]) {
  const semantics = new Set(templateSemantics[template.id] ?? [])
  let score = 0
  for (const token of tokens) {
    if (semantics.has(token)) score += 14
  }
  if (tokens.includes("classic") && classicTemplateIds.includes(template.id))
    score += 10
  if (
    tokens.includes("developer") &&
    ["facepalm", "fry", "noidea", "scc", "fine", "harold"].includes(template.id)
  ) {
    score += 16
  }
  if (
    tokens.includes("semicolon") &&
    ["facepalm", "scc", "success", "fry"].includes(template.id)
  )
    score += 18
  if (
    tokens.includes("change") &&
    ["gru", "facepalm", "badchoice", "fine", "harold", "crazypills"].includes(
      template.id,
    )
  ) {
    score += 18
  }
  if (
    (tokens.includes("deploy") ||
      tokens.includes("production") ||
      tokens.includes("monitor")) &&
    [
      "disastergirl",
      "fine",
      "facepalm",
      "crazypills",
      "scc",
      "success",
    ].includes(template.id)
  ) {
    score += 18
  }
  if (
    tokens.includes("expectation") &&
    ["drake", "db", "gru", "badchoice", "fine", "harold"].includes(template.id)
  ) {
    score += 16
  }
  if (
    tokens.includes("realization") &&
    tokens.includes("confused") &&
    ["scc", "fry", "astronaut", "facepalm", "gb"].includes(template.id)
  ) {
    score += 14
  }
  if (
    tokens.includes("panic") &&
    tokens.includes("relief") &&
    ["fine", "scc", "success", "harold"].includes(template.id)
  ) {
    score += 16
  }
  return score
}

function lineFitScore(template: MemeTemplate, lineCount?: number) {
  if (!lineCount) return 0
  if (template.lines === lineCount) return 18
  if (template.lines > lineCount)
    return Math.max(4, 12 - (template.lines - lineCount) * 2)
  return -Math.min(12, (lineCount - template.lines) * 4)
}

export function scoreTemplate(template: MemeTemplate, query: string) {
  const q = normalize(query)
  if (!q) return classicTemplateIds.includes(template.id) ? 2 : 1
  const tokens = queryTokens(query)
  const fields = [
    template.id,
    template.name,
    ...template.keywords,
    ...template.styles,
    template.source ?? "",
  ].map(normalize)
  const candidateTokens = templateTokens(template)

  let score = 0
  if (normalize(template.id) === q) score += 100
  if (normalize(template.name) === q) score += 90
  if (classicTemplateIds.includes(template.id)) score += 1
  score += templateBoost(template, tokens)

  for (const text of fields) {
    if (!text) continue
    if (text === q) score += 40
    else if (q.length >= 4 && text.includes(q)) score += 16
  }

  for (const token of tokens) {
    score += exactTokenScore(candidateTokens, token)
  }

  if (tokens.includes("random")) score += hashScore(`${q}:${template.id}`) * 4
  return score
}

export function rankMemeTemplates(input: MemeTemplateSearchInput) {
  const limit = input.limit ?? 12
  const style = input.style ? normalize(input.style) : undefined
  const styleFilter = style && supportedStyles.has(style) ? style : undefined
  const query = [input.query ?? "", style && !styleFilter ? style : ""].filter(Boolean).join(" ")
  return templates
    .filter((template) =>
      input.minLines ? template.lines >= input.minLines : true,
    )
    .filter((template) =>
      styleFilter ? template.styles.map(normalize).includes(styleFilter) : true,
    )
    .map((template) => ({
      template,
      score:
        scoreTemplate(template, query) +
        lineFitScore(template, input.lineCount),
    }))
    .filter((entry) => !query || entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        hashScore(`${query}:${b.template.id}`) -
          hashScore(`${query}:${a.template.id}`),
    )
    .slice(0, limit)
}

export function findMemeTemplates(input: MemeTemplateSearchInput) {
  return rankMemeTemplates(input).map(({ template }) => template)
}

export function selectMemeTemplate(
  input: Omit<MemeTemplateSearchInput, "limit">,
): MemeTemplate | undefined {
  const matches = findMemeTemplates({ ...input, limit: isRandomMemeRequest(input.query) ? 8 : 1 })
  if (isRandomMemeRequest(input.query) && matches.length > 0) {
    const match = matches[randomSelectionIndex % matches.length]
    randomSelectionIndex++
    return match
  }
  const [match] = matches
  if (match) return match

  const fallback = [...classicTemplateIds].sort(
    (a, b) =>
      hashScore(`${input.query ?? ""}:${b}`) -
      hashScore(`${input.query ?? ""}:${a}`),
  )
  for (const id of fallback) {
    const template = templates.find((item) => item.id === id)
    if (!template) continue
    if (input.minLines && template.lines < input.minLines) continue
    if (
      input.style &&
      !template.styles.map(normalize).includes(normalize(input.style))
    )
      continue
    return template
  }

  return templates.find((template) => {
    if (input.minLines && template.lines < input.minLines) return false
    if (
      input.style &&
      !template.styles.map(normalize).includes(normalize(input.style))
    )
      return false
    return true
  })
}

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
      keywords: [
        ...new Set([
          ...(templateSemantics[template.id] ?? []),
          ...template.keywords,
        ]),
      ].slice(0, 10),
      fit: args.lineCount
        ? template.lines === args.lineCount
          ? "exact"
          : template.lines > args.lineCount
            ? "supports-extra-lines"
            : "fewer-lines"
        : "unspecified",
    }))

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
    }
  },
})
