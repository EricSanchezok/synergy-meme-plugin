import type { PluginInput } from "@ericsanchezok/synergy-plugin"
import { tool, type ToolResult } from "@ericsanchezok/synergy-plugin/tool"
import { templateById } from "../data/templates.generated"
import { renderMemeSvg } from "../render/svg"

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

function unwrapAssetInfo(result: unknown): AssetInfo {
  const data = (result as any)?.data ?? result
  if (!data || typeof data !== "object" || typeof (data as any).url !== "string") {
    throw new Error("Synergy asset upload did not return an asset URL")
  }
  return data as AssetInfo
}

export function createGenerateMemeTool(input: PluginInput) {
  return tool({
    description:
      "Generate a meme image from a bundled template. Use search_meme_templates first when you need a template id.",
    args: {
      template: tool.schema.string().min(1).describe("Template id, for example drake, db, gb, astronaut."),
      lines: tool.schema
        .array(tool.schema.string().min(1).max(180))
        .min(1)
        .max(8)
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
    },
    async execute(args, context): Promise<ToolResult> {
      const templateId = args.template.trim().toLocaleLowerCase()
      const template = templateById[templateId]
      if (!template) {
        return {
          title: "Unknown meme template",
          output: `Unknown meme template "${args.template}". Run search_meme_templates to find a valid template id.`,
          metadata: { template: args.template, error: "unknown_template" },
        }
      }

      const lines = args.lines.map((line) => line.trim()).filter(Boolean)
      if (lines.length === 0) {
        return {
          title: "Missing meme text",
          output: "Provide at least one non-empty text line.",
          metadata: { template: template.id, error: "missing_lines" },
        }
      }
      if (lines.length > template.lines) {
        return {
          title: "Too many meme lines",
          output: `Template "${template.name}" (${template.id}) supports ${template.lines} line(s), but ${lines.length} were provided.`,
          metadata: { template: template.id, supportedLines: template.lines, providedLines: lines.length },
        }
      }

      const requestedStyle = args.style?.trim()
      if (requestedStyle && !template.styles.includes(requestedStyle)) {
        return {
          title: "Unsupported meme style",
          output: `Template "${template.name}" does not support style "${requestedStyle}". Supported styles: ${template.styles.join(", ") || "default"}.`,
          metadata: { template: template.id, style: requestedStyle, supportedStyles: template.styles },
        }
      }

      const rendered = await renderMemeSvg({
        pluginDir: input.pluginDir,
        template,
        lines,
        layout: args.layout ?? "default",
        captionCase: args.captionCase ?? "uppercase",
      })

      const filename = `${safeName(template.id)}-${Date.now().toString(36)}.svg`
      const file = new File([rendered.svg], filename, { type: "image/svg+xml" })
      const uploaded = unwrapAssetInfo(await input.client.asset.upload({ file } as any, { throwOnError: true } as any))
      const partId = attachmentPartId()

      return {
        title: template.name,
        output: "",
        metadata: {
          template: template.id,
          templateName: template.name,
          lines,
          style: requestedStyle ?? "default",
          dimensions: { width: rendered.width, height: rendered.height },
          assetId: uploaded.id,
          display: {
            presentation: "artifact-only",
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
  })
}
