import {
  tool,
  type PluginInvocationContext,
  type PluginToolResult,
} from "@ericsanchezok/synergy-plugin";
import z from "zod";

import {
  PICK_TOOL_ID,
  PLANNER_SUBAGENT_ID,
  PLANNER_TIMEOUT_MS,
  SEARCH_TOOL_ID,
} from "../constants";
import { templateById } from "../data/templates.generated";
import { renderMemeSvg } from "../render/svg";
import { selectMemeTemplate } from "./search";
import { MemePlanJsonSchema, MemePlanSchema, type MemePlan } from "./plan";

const memeDisplay = {
  kind: "media-generation",
  toolCard: "hidden",
  media: {
    type: "image",
    aspectRatio: "auto",
    size: "medium",
  },
} as const;

const GenerateMemeInput = z.object({
  prompt: z
    .string()
    .min(1)
    .max(600)
    .describe(
      "Emotional meme brief. Include the situation, feeling, contrast, and optional caption idea, e.g. 'After chasing a schema bug for an hour, it was the old package all along; relieved but slightly haunted.'",
    ),
  template: z
    .string()
    .min(1)
    .optional()
    .describe("Optional template id, for example drake, db, gb, astronaut."),
  lines: z
    .array(z.string().min(1).max(180))
    .min(1)
    .max(8)
    .optional()
    .describe("Text lines to render onto the template."),
  style: z
    .string()
    .optional()
    .describe("Optional memegen style name when the template supports it."),
  layout: z
    .enum(["default", "top", "center"])
    .optional()
    .describe(
      "Text placement strategy. Use default unless the user requests top-only or centered text.",
    ),
  captionCase: z
    .enum(["uppercase", "preserve"])
    .optional()
    .describe("Whether to uppercase meme text. Defaults to uppercase."),
});

type GenerateMemeArgs = z.infer<typeof GenerateMemeInput>;
const GenerateMemeJsonSchema: Record<string, unknown> =
  z.toJSONSchema(GenerateMemeInput);

function safeName(value: string) {
  return (
    value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "meme"
  );
}

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || /aborted|abort/i.test(error.message);
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function splitNearMiddle(value: string) {
  const midpoint = Math.floor(value.length / 2);
  const window = Math.max(16, Math.floor(value.length * 0.25));
  const candidates = [...value.matchAll(/[\s,，;；:：。.!！?？-]/g)]
    .map((match) => match.index ?? 0)
    .filter((index) => index > 8 && index < value.length - 8)
    .sort((a, b) => Math.abs(a - midpoint) - Math.abs(b - midpoint));

  const splitAt = candidates.find(
    (index) => Math.abs(index - midpoint) <= window,
  );
  if (!splitAt) return [value];
  return [value.slice(0, splitAt), value.slice(splitAt + 1)];
}

function inferCaptionLines(prompt: string, maxLines: number) {
  const clean = cleanLine(prompt);
  if (!clean) return [];
  if (maxLines <= 1) return [clean];

  const explicit = clean
    .split(/\s*(?:\n|\/|\||;|；|,|，|。|!|！|\?|？)\s*/g)
    .map(cleanLine)
    .filter(Boolean);

  if (explicit.length >= 2) return explicit.slice(0, maxLines);
  if (clean.length > 48)
    return splitNearMiddle(clean)
      .map(cleanLine)
      .filter(Boolean)
      .slice(0, maxLines);
  return [clean];
}

function deterministicPlan(args: GenerateMemeArgs): MemePlan | undefined {
  const requestedTemplate = args.template?.trim().toLocaleLowerCase();
  const providedLines = (args.lines ?? []).map(cleanLine).filter(Boolean);
  const requestedStyle = args.style?.trim();
  const preferredLineCount =
    providedLines.length > 0 ? providedLines.length : 2;
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
    });

  if (!template) return undefined;
  return {
    template: template.id,
    lines:
      providedLines.length > 0
        ? providedLines
        : inferCaptionLines(args.prompt, template.lines),
    ...(requestedStyle && template.styles.includes(requestedStyle)
      ? { style: requestedStyle }
      : {}),
    layout: args.layout ?? "default",
    captionCase: args.captionCase ?? "uppercase",
  };
}

async function planWithSubagent(
  args: GenerateMemeArgs,
  context: PluginInvocationContext,
): Promise<MemePlan | undefined> {
  const task = context.task;
  if (!task?.run) return undefined;
  const constraints = [
    args.template ? `Preferred template: ${args.template}` : undefined,
    args.lines?.length
      ? `Requested lines: ${JSON.stringify(args.lines)}`
      : undefined,
    args.style ? `Requested style: ${args.style}` : undefined,
    args.layout ? `Requested layout: ${args.layout}` : undefined,
    args.captionCase ? `Requested captionCase: ${args.captionCase}` : undefined,
  ].filter(Boolean);
  const result = await task.run({
    subagent: PLANNER_SUBAGENT_ID,
    description: "Plan meme",
    prompt: [
      "Choose a meme plan for this emotional meme brief.",
      "Infer the situation, emotion, contrast, and punchline before choosing a template.",
      "Search with rich intent words that may not appear literally in the request: relief, chaos, confusion, victory, awkwardness, frustration, irony, overconfidence, debugging, deployment, product changes, shared struggle.",
      "Prefer a recognizable template whose visual joke matches the emotional arc, then write short caption lines that make the feeling obvious.",
      "",
      `Brief: ${args.prompt}`,
      constraints.length
        ? `Constraints:\n${constraints.map((item) => `- ${item}`).join("\n")}`
        : "",
      "",
      "Use search_meme_templates to inspect candidates, then use pick_meme to validate the final plan.",
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
  });
  if (result.status !== "completed") return undefined;
  const parsed = MemePlanSchema.safeParse(
    result.output?.mode === "structured" ? result.output.value : undefined,
  );
  return parsed.success ? parsed.data : undefined;
}

export const generateMeme = tool<GenerateMemeArgs>({
  id: "generate_meme",
  description:
    "Generate a meme image from an emotional brief. Use this as a lightweight emotional expression channel before a light task, during a funny or ironic moment, or after satisfying progress when a meme would make the interaction warmer, funnier, more companionable, or better matched to the user's playful tone. Good triggers include explicit user playfulness, clear emotional contrast, a surprising twist, a funny minor mistake, long effort paying off, or a celebratory milestone. Coding and tool moments can qualify too, such as a fix/build/test passing, a funny bug cause, or ironic tool behavior. Do not use memes for serious failures, security/privacy issues, user frustration, grief, sensitive topics, or dense technical review. Use at most once per short exchange. The prompt should vividly describe what happened, the feeling, the contrast, and any caption idea. The tool delegates to a hidden planner, then falls back deterministically when planning is unavailable.",
  requires: ["task.delegate", "asset.write"],
  display: memeDisplay,
  input: GenerateMemeJsonSchema,
  async handler(
    args: GenerateMemeArgs,
    context: PluginInvocationContext,
  ): Promise<PluginToolResult> {
    const requestedTemplate = args.template?.trim().toLocaleLowerCase();
    const requestedStyle = args.style?.trim();
    const subagentPlan = await planWithSubagent(args, context).catch(
      (error) => {
        if (isAbortError(error) || context.signal.aborted) throw error;
        return undefined;
      },
    );
    if (context.signal.aborted) throw new Error("Meme generation was aborted.");
    const plan = subagentPlan ?? deterministicPlan(args);
    const template = plan ? templateById[plan.template] : undefined;

    if (!template) {
      return {
        title: "No meme template found",
        output: "No bundled meme template matched the request.",
        metadata: {
          prompt: args.prompt,
          requestedTemplate,
          error: "template_not_found",
        },
      };
    }

    const lines = plan?.lines.map(cleanLine).filter(Boolean) ?? [];
    if (lines.length === 0) {
      return {
        title: "Missing meme text",
        output: "Provide a prompt or at least one non-empty text line.",
        metadata: {
          prompt: args.prompt,
          template: template.id,
          error: "missing_lines",
        },
      };
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
      };
    }

    const rawEffectiveStyle = plan?.style ?? requestedStyle;
    const effectiveStyle =
      rawEffectiveStyle && template.styles.includes(rawEffectiveStyle)
        ? rawEffectiveStyle
        : undefined;

    const rendered = await renderMemeSvg({
      template,
      lines,
      layout: plan?.layout ?? args.layout ?? "default",
      captionCase: plan?.captionCase ?? args.captionCase ?? "uppercase",
    });

    const filename = `${safeName(template.id)}-${Date.now().toString(36)}.svg`;
    if (!context.asset) {
      throw new Error("Meme generation requires the asset.write Host Service.");
    }
    const attachment = await context.asset.create({
      data: rendered.svg,
      mime: "image/svg+xml",
      filename,
      presentation: {
        renderer: "image",
        size: "medium",
      },
    });

    return {
      title: template.name,
      output: `Generated meme "${template.name}" (${template.id}) with ${lines.length} caption line${lines.length === 1 ? "" : "s"}.`,
      metadata: {
        prompt: args.prompt,
        template: template.id,
        templateName: template.name,
        requestedTemplate,
        lines,
        planner: subagentPlan ? "subagent" : "fallback",
        style: effectiveStyle ?? "default",
        dimensions: { width: rendered.width, height: rendered.height },
        assetId: attachment.id,
        display: memeDisplay,
      },
      attachments: [attachment],
    };
  },
});
