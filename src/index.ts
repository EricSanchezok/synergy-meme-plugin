import type {
  PluginDescriptor,
  PluginHooks,
  PluginInput,
} from "@ericsanchezok/synergy-plugin";
import {
  PICK_TOOL_ID,
  PICK_TOOL_NAME,
  PLANNER_SUBAGENT_ID,
  PLUGIN_ID,
  SEARCH_TOOL_ID,
  SEARCH_TOOL_NAME,
} from "./constants";
import { createGenerateMemeTool } from "./tools/generate";
import { pickMeme } from "./tools/plan";
import { searchMemeTemplates } from "./tools/search";

const MEME_EXPRESSION_SYSTEM_PROMPT = [
  '<meme-expression source="synergy-meme-plugin">',
  "You can use generate_meme as a lightweight emotional expression channel when a meme would make the interaction warmer, funnier, or more companionable.",
  "Good uses: celebrating progress, reacting to a funny bug cause, sharing relief after a fix, playful self-awareness after a small detour, or matching the user's light tone.",
  "Give the tool a vivid emotional brief: what happened, the feeling, the contrast, and any caption idea. Prefer short punchy captions and let the tool choose the template.",
  "Use memes as part of the conversation around real work: keep explaining, implementing, or verifying normally, and let the meme carry the feeling.",
  "</meme-expression>",
].join("\n");

function shouldInjectMemeExpression(input: { agent: string; small?: boolean }) {
  if (input.small) return false;
  return input.agent === "synergy" || input.agent === "synergy-max";
}

export const plugin: PluginDescriptor = {
  id: PLUGIN_ID,
  name: "Synergy Meme Plugin",
  async init(input: PluginInput): Promise<PluginHooks> {
    return {
      agents: {
        [PLANNER_SUBAGENT_ID]: {
          name: PLANNER_SUBAGENT_ID,
          description:
            "Hidden planner for Synergy Meme Plugin. Selects a meme template and caption plan using internal meme helper tools.",
          mode: "subagent",
          modelRole: "mid",
          hidden: true,
          prompt: [
            "You are the hidden planner for Synergy Meme Plugin.",
            "Turn the user's emotional meme brief into a concrete validated meme plan.",
            "Understand the situation, feeling, contrast, and punchline before choosing a template.",
            "Search with emotion-rich keywords, not just literal words from the request: relief, chaos, confusion, victory, awkwardness, frustration, irony, overconfidence, debugging, deployment, product changes, or shared struggle.",
            "Choose a recognizable template whose visual joke matches the emotional arc, then write short caption lines that make the feeling clear.",
            "Use search_meme_templates before choosing a template unless the prompt explicitly names one.",
            "Use pick_meme to validate and normalize the final template, lines, style, layout, and caption casing.",
            "Never call generate_meme or delegate to another task.",
            "Prefer the structured_task_result completion tool when it is available.",
          ].join("\n"),
          permission: {
            "*": "deny",
            [SEARCH_TOOL_ID]: "allow",
            [PICK_TOOL_ID]: "allow",
          },
        },
      },
      tool: {
        generate_meme: createGenerateMemeTool(input),
        [SEARCH_TOOL_NAME]: searchMemeTemplates,
        [PICK_TOOL_NAME]: pickMeme,
      },
      async "experimental.chat.system.transform"(hookInput, output) {
        const agent = (hookInput as any).agent as string | undefined;
        const small = !!(hookInput as any).small;
        if (!shouldInjectMemeExpression({ agent: agent ?? "", small })) return;
        if (
          output.system.some((part) =>
            part.includes('<meme-expression source="synergy-meme-plugin">'),
          )
        )
          return;
        output.system.push(MEME_EXPRESSION_SYSTEM_PROMPT);
      },
    };
  },
};

export default plugin;
