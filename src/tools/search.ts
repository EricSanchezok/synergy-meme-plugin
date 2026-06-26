import { tool } from "@ericsanchezok/synergy-plugin/tool"
import { templates } from "../data/templates.generated"
import type { MemeTemplate } from "../data/types"

export interface MemeTemplateSearchInput {
  query?: string
  limit?: number
  lineCount?: number
  style?: string
}

function normalize(value: string) {
  return value.toLocaleLowerCase().trim()
}

export function scoreTemplate(template: MemeTemplate, query: string) {
  if (!query) return 1
  const q = normalize(query)
  const haystacks = [template.id, template.name, ...template.keywords, ...template.styles, template.source ?? ""].map(
    normalize,
  )

  let score = 0
  if (normalize(template.id) === q) score += 100
  if (normalize(template.name) === q) score += 90
  for (const text of haystacks) {
    if (!text) continue
    if (text.includes(q)) score += text === q ? 40 : 20
    for (const token of q.split(/\s+/)) {
      if (token && text.includes(token)) score += 6
    }
  }
  return score
}

export function findMemeTemplates(input: MemeTemplateSearchInput) {
  const limit = input.limit ?? 12
  const style = input.style ? normalize(input.style) : undefined
  return templates
    .filter((template) => (input.lineCount ? template.lines === input.lineCount : true))
    .filter((template) => (style ? template.styles.map(normalize).includes(style) : true))
    .map((template) => ({
      template,
      score: scoreTemplate(template, input.query ?? ""),
    }))
    .filter((entry) => !input.query || entry.score > 0)
    .sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id))
    .slice(0, limit)
    .map(({ template }) => template)
}

export function selectMemeTemplate(input: Omit<MemeTemplateSearchInput, "limit">): MemeTemplate | undefined {
  const [match] = findMemeTemplates({ ...input, limit: 1 })
  if (match) return match

  const preferred = ["drake", "db", "gb", "astronaut", "fine", "disastergirl"]
  for (const id of preferred) {
    const template = templates.find((item) => item.id === id)
    if (!template) continue
    if (input.lineCount && template.lines !== input.lineCount) continue
    if (input.style && !template.styles.map(normalize).includes(normalize(input.style))) continue
    return template
  }

  return templates.find((template) => {
    if (input.lineCount && template.lines !== input.lineCount) return false
    if (input.style && !template.styles.map(normalize).includes(normalize(input.style))) return false
    return true
  })
}

export const searchMemeTemplates = tool({
  description: "Search bundled meme templates by id, name, keyword, style, or line count.",
  exposure: { mode: "internal" } as any,
  args: {
    query: tool.schema.string().optional().describe("Search text, for example drake, distracted, brain, choice."),
    limit: tool.schema.number().int().min(1).max(50).optional().describe("Maximum number of templates to return."),
    lineCount: tool.schema
      .number()
      .int()
      .min(1)
      .max(8)
      .optional()
      .describe("Only return templates with this line count."),
    style: tool.schema.string().optional().describe("Only return templates supporting this style."),
  },
  async execute(args) {
    const matches = findMemeTemplates(args).map((template) => ({
      id: template.id,
      name: template.name,
      lines: template.lines,
      styles: template.styles,
      keywords: template.keywords.slice(0, 8),
    }))

    return {
      title: "Meme templates",
      output: JSON.stringify(matches, null, 2),
      metadata: {
        query: args.query ?? "",
        count: matches.length,
        totalTemplates: templates.length,
      },
    }
  },
})
