import z from "zod"
import { tool } from "@ericsanchezok/synergy-plugin/tool"
import { templateById } from "../data/templates.generated"

export const MemePlanSchema = z.object({
  template: z.string().min(1),
  lines: z.array(z.string().min(1).max(180)).min(1).max(8),
  style: z.string().optional(),
  layout: z.enum(["default", "top", "center"]).optional(),
  captionCase: z.enum(["uppercase", "preserve"]).optional(),
})

export type MemePlan = z.infer<typeof MemePlanSchema>

export const MemePlanJsonSchema = z.toJSONSchema(MemePlanSchema) as Record<string, any>

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180)
}

export const pickMeme = tool({
  description:
    "Finalize a meme plan after searching templates. Validates the selected template, caption lines, style, layout, and caption casing.",
  exposure: { mode: "internal" } as any,
  args: {
    template: tool.schema.string().min(1).describe("Chosen bundled template id."),
    lines: tool.schema.array(tool.schema.string().min(1).max(180)).min(1).max(8).describe("Caption lines to render."),
    style: tool.schema.string().optional().describe("Optional template style."),
    layout: tool.schema.enum(["default", "top", "center"]).optional(),
    captionCase: tool.schema.enum(["uppercase", "preserve"]).optional(),
  },
  async execute(args) {
    const template = templateById[args.template.trim().toLocaleLowerCase()]
    if (!template) {
      return {
        title: "Unknown meme template",
        output: JSON.stringify({ error: "template_not_found", template: args.template }, null, 2),
      }
    }

    const lines = args.lines.map(cleanLine).filter(Boolean)
    if (lines.length === 0) {
      return {
        title: "Missing meme lines",
        output: JSON.stringify({ error: "missing_lines", template: template.id }, null, 2),
      }
    }
    if (lines.length > template.lines) {
      return {
        title: "Too many meme lines",
        output: JSON.stringify(
          {
            error: "too_many_lines",
            template: template.id,
            supportedLines: template.lines,
            providedLines: lines.length,
          },
          null,
          2,
        ),
      }
    }
    const style = args.style && template.styles.includes(args.style) ? args.style : undefined

    const plan: MemePlan = {
      template: template.id,
      lines,
      ...(style ? { style } : {}),
      layout: args.layout ?? "default",
      captionCase: args.captionCase ?? "uppercase",
    }
    return {
      title: "Meme plan",
      output: JSON.stringify(plan, null, 2),
      metadata: { plan },
    }
  },
})
