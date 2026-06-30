import type { PluginInput } from "@ericsanchezok/synergy-plugin"
import { tool, type ToolContext, type ToolResult } from "@ericsanchezok/synergy-plugin/tool"
import z from "zod"
import { PICK_TOOL_ID, PLANNER_SUBAGENT_ID, PLANNER_TIMEOUT_MS, SEARCH_TOOL_ID } from "../constants"
import { templateById } from "../data/templates.generated"
import { renderMemeSvg } from "../render/svg"
import { selectMemeTemplate } from "./search"
import { MemePlanJsonSchema, MemePlanSchema, type MemePlan } from "./plan"

const memeDisplay = {
  kind: "media-generation",
  visibility: "media",
  presentation: "artifact-only",
  media: {
    type: "image",
    aspectRatio: "1:1",
  },
} as const

const generateMemeArgs = {
  prompt: tool.schema.string().min(1).max(600).describe("Natural-language meme request or caption idea."),
  template: tool.schema
    .string()
    .min(1)
    .optional()
    .describe("Optional template id, for example drake, db, gb, astronaut."),
  lines: tool.schema
    .array(tool.schema.string().min(1).max(180))
    .min(1)
    .max(8)
    .optional()
    .describe("Text lines to render onto the template."),
  style: tool.schema.string().optional().describe("Optional memegen style name when the template supports it."),
  layout: tool.schema
    .enum(["default", "top", "center"])
    .optional()
    .describe("Text placement strategy. Use default unless the user requests top-only or centered text."),
  captionCase: tool.schema
    .enum(["uppercase", "preserve"])
    .optional()
    .describe("Whether to uppercase meme text. Defaults to uppercase."),
}

type GenerateMemeArgs = z.infer<z.ZodObject<typeof generateMemeArgs>>

type AssetInfo = {
  id: string
  url: string
  mime: string
  size: number
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "meme"
}

function attachmentPartId() {
  return `part_meme_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`
}

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) return false
  return error.name === "AbortError" || /aborted|abort/i.test(error.message)
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180)
}

function splitNearMiddle(value: string) {
  const midpoint = Math.floor(value.length / 2)
  const window = Math.max(16, Math.floor(value.length * 0.25))
  const candidates = [...value.matchAll(/[\s,，;；:：。.!！?？-]/g)]
    .map((match) => match.index ?? 0)
    .filter((index) => index > 8 && index < value.length - 8)
    .sort((a, b) => Math.abs(a - midpoint) - Math.abs(b - midpoint))

  const splitAt = candidates.find((index) => Math.abs(index - midpoint) <= window)
  if (!splitAt) return [value]
  return [value.slice(0, splitAt), value.slice(splitAt + 1)]
}

function inferCaptionLines(prompt: string, maxLines: number) {
  const clean = cleanLine(prompt)
  if (!clean) return []
  if (maxLines <= 1) return [clean]

  const explicit = clean
    .split(/\s*(?:\n|\/|\||;|；|,|，|。|!|！|\?|？)\s*/g)
    .map(cleanLine)
    .filter(Boolean)

  if (explicit.length >= 2) return explicit.slice(0, maxLines)
  if (clean.length > 48) return splitNearMiddle(clean).map(cleanLine).filter(Boolean).slice(0, maxLines)
  return [clean]
}

function deterministicPlan(args: GenerateMemeArgs): MemePlan | undefined {
  const requestedTemplate = args.template?.trim().toLocaleLowerCase()
  const providedLines = (args.lines ?? []).map(cleanLine).filter(Boolean)
  const requestedStyle = args.style?.trim()
  const preferredLineCount = providedLines.length > 0 ? providedLines.length : 2
  const template =
    (requestedTemplate ? templateById[requestedTemplate] : undefined) ??
    selectMemeTemplate({
      query: args.prompt,
      lineCount: preferredLineCount,
      minLines: providedLines.length > 0 ? providedLines.length : undefined,
      style: requestedStyle,
    }) ??
    selectMemeTemplate({
      query: args.prompt,
      minLines: providedLines.length > 0 ? providedLines.length : undefined,
      style: requestedStyle,
    })

  if (!template) return undefined
  return {
    template: template.id,
    lines: providedLines.length > 0 ? providedLines : inferCaptionLines(args.prompt, template.lines),
    ...(requestedStyle && template.styles.includes(requestedStyle) ? { style: requestedStyle } : {}),
    layout: args.layout ?? "default",
    captionCase: args.captionCase ?? "uppercase",
  }
}

async function planWithSubagent(args: GenerateMemeArgs, context: ToolContext): Promise<MemePlan | undefined> {
  const task = (context as any).task
  if (!task?.run) return undefined
  const constraints = [
    args.template ? `Preferred template: ${args.template}` : undefined,
    args.lines?.length ? `Requested lines: ${JSON.stringify(args.lines)}` : undefined,
    args.style ? `Requested style: ${args.style}` : undefined,
    args.layout ? `Requested layout: ${args.layout}` : undefined,
    args.captionCase ? `Requested captionCase: ${args.captionCase}` : undefined,
  ].filter(Boolean)
  const result = await task.run({
    subagent: PLANNER_SUBAGENT_ID,
    description: "Plan meme",
    prompt: [
      "Choose a meme plan for the user's request.",
      "",
      `Request: ${args.prompt}`,
      constraints.length ? `Constraints:\n${constraints.map((item) => `- ${item}`).join("\n")}` : "",
      "",
      "Use the available helper tools only:",
      "- search_meme_templates to inspect candidate templates.",
      "- pick_meme to validate and normalize a candidate plan before submitting the final structured result.",
      "",
      "Prefer a recognizable meme template that matches the requested emotion or contrast.",
      "Submit the final result using the structured output contract.",
    ]
      .filter(Boolean)
      .join("\n"),
    tools: {
      "*": false,
      [SEARCH_TOOL_ID]: true,
      [PICK_TOOL_ID]: true,
    },
    visibility: "hidden",
    timeoutMs: PLANNER_TIMEOUT_MS,
    output: {
      mode: "structured",
      schema: MemePlanJsonSchema,
      maxRepairTurns: 3,
    },
  })
  if (result.status !== "completed") return undefined
  const parsed = MemePlanSchema.safeParse(result.outputResult?.mode === "structured" ? result.outputResult.data : undefined)
  return parsed.success ? parsed.data : undefined
}

function unwrapAssetInfo(result: unknown): AssetInfo {
  const data = (result as any)?.data ?? result
  if (!data || typeof data !== "object" || typeof (data as any).url !== "string") {
    throw new Error("Synergy asset upload did not return an asset URL")
  }
  return data as AssetInfo
}

export function createGenerateMemeTool(input: PluginInput) {
  const definition = {
    description:
      "Generate a meme image from a short natural-language prompt. Pick the template internally unless the user explicitly names one.",
    display: memeDisplay,
    args: generateMemeArgs,
    async execute(args: GenerateMemeArgs, context: ToolContext): Promise<ToolResult> {
      const requestedTemplate = args.template?.trim().toLocaleLowerCase()
      const requestedStyle = args.style?.trim()
      const subagentPlan = await planWithSubagent(args, context).catch((error) => {
        if (isAbortError(error) || context.abort.aborted) throw error
        return undefined
      })
      if (context.abort.aborted) throw new Error("Meme generation was aborted.")
      const plan = subagentPlan ?? deterministicPlan(args)
      const template = plan ? templateById[plan.template] : undefined

      if (!template) {
        return {
          title: "No meme template found",
          output: "No bundled meme template matched the request.",
          metadata: {
            prompt: args.prompt,
            requestedTemplate,
            error: "template_not_found",
          },
        }
      }

      const lines = plan?.lines.map(cleanLine).filter(Boolean) ?? []
      if (lines.length === 0) {
        return {
          title: "Missing meme text",
          output: "Provide a prompt or at least one non-empty text line.",
          metadata: {
            prompt: args.prompt,
            template: template.id,
            error: "missing_lines",
          },
        }
      }
      if (lines.length > template.lines) {
        return {
          title: "Too many meme lines",
          output: `Template "${template.name}" (${template.id}) supports ${template.lines} line(s), but ${lines.length} were provided.`,
          metadata: {
            prompt: args.prompt,
            template: template.id,
            supportedLines: template.lines,
            providedLines: lines.length,
          },
        }
      }

      const rawEffectiveStyle = plan?.style ?? requestedStyle
      const effectiveStyle =
        rawEffectiveStyle && template.styles.includes(rawEffectiveStyle) ? rawEffectiveStyle : undefined

      const rendered = await renderMemeSvg({
        pluginDir: input.pluginDir,
        template,
        lines,
        layout: plan?.layout ?? args.layout ?? "default",
        captionCase: plan?.captionCase ?? args.captionCase ?? "uppercase",
      })

      const filename = `${safeName(template.id)}-${Date.now().toString(36)}.svg`
      const file = new File([rendered.svg], filename, {
        type: "image/svg+xml",
      })
      const uploaded = unwrapAssetInfo(await input.client.asset.upload({ file } as any, { throwOnError: true } as any))
      const partId = attachmentPartId()

      return {
        title: template.name,
        output: "",
        metadata: {
          prompt: args.prompt,
          template: template.id,
          templateName: template.name,
          requestedTemplate,
          lines,
          planner: subagentPlan ? "subagent" : "fallback",
          style: effectiveStyle ?? "default",
          dimensions: { width: rendered.width, height: rendered.height },
          assetId: uploaded.id,
          display: {
            ...memeDisplay,
            primaryAttachmentIds: [partId],
          },
        },
        attachments: [
          {
            id: partId,
            sessionID: context.sessionID,
            messageID: context.messageID,
            type: "file",
            mime: "image/svg+xml",
            filename,
            url: uploaded.url,
          },
        ],
      }
    },
  }

  return tool(definition)
}
