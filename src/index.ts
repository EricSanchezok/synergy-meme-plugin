import {
  agent,
  capability,
  definePlugin,
  hook,
} from "@ericsanchezok/synergy-plugin";
import {
  PICK_TOOL_ID,
  PLANNER_SUBAGENT_ID,
  PLUGIN_ID,
  SEARCH_TOOL_ID,
} from "./constants";
import { generateMeme } from "./tools/generate";
import { pickMeme } from "./tools/plan";
import { searchMemeTemplates } from "./tools/search";

const MEME_EXPRESSION_SYSTEM_PROMPT = [
  '<meme-expression source="synergy-meme-plugin">',
  "Use generate_meme as a lightweight emotional expression channel when a meme would make the interaction warmer, funnier, more companionable, or better matched to the user's playful tone.",
  "Briefly check for meme-worthy moments before a light task, during a funny or ironic turn, and after satisfying progress or a small shared win.",
  "Good triggers: the user is joking or explicitly playful, a situation has a clear emotional contrast, a surprising twist appears, a minor mistake becomes funny, a long effort finally pays off, or the conversation reaches a celebratory milestone.",
  "Coding and tool moments can qualify too, such as a fix/build/test passing, a funny bug cause, or ironic tool behavior, but do not limit meme use to engineering work.",
  "If a meme fits, call generate_meme at the natural moment; do not wait for the final response when an in-progress reaction would feel better.",
  "Give the tool a vivid emotional brief: what happened, the feeling, the contrast, and any caption idea. Prefer short punchy captions and let the tool choose the template unless a template is requested.",
  "Do not use memes for serious failures, security or privacy issues, user frustration, grief, sensitive topics, dense technical review, or moments where an attachment would interrupt focused work.",
  "Use at most once per short exchange. Keep helping normally; let the meme carry the feeling without replacing the actual answer or work.",
  "</meme-expression>",
].join("\n");

function shouldInjectMemeExpression(input: { agent: string; small?: boolean }) {
  if (input.small) return false;
  return input.agent === "synergy" || input.agent === "synergy-max";
}

export const plugin = definePlugin({
  id: PLUGIN_ID,
  name: "Synergy Meme Plugin",
  version: "0.4.0",
  description:
    "Generate expressive meme images from bundled memegen.link templates.",
  compatibility: { synergy: ">=3.0.11" },
  author: "EricSanchez",
  homepage: "https://github.com/EricSanchezok/synergy-meme-plugin",
  repository: "https://github.com/EricSanchezok/synergy-meme-plugin",
  license: "MIT",
  icon: "icons/market.svg",
  keywords: ["synergy-plugin", "meme", "image", "memegen"],
  assets: [{ source: "public/assets", target: "runtime/assets" }],
  capabilities: [
    capability("task.delegate", {
      agents: [PLANNER_SUBAGENT_ID],
      maxRuntimeMs: 120_000,
    }),
    capability("asset.write"),
  ],
  contributions: [
    agent({
      id: PLANNER_SUBAGENT_ID,
      agent: {
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
    }),
    generateMeme,
    searchMemeTemplates,
    pickMeme,
    hook<"chat.system.transform">({
      id: "meme-expression",
      point: "chat.system.transform",
      async handler(input) {
        if (!shouldInjectMemeExpression(input)) return { system: input.system };
        if (
          input.system.some((part) =>
            part.includes('<meme-expression source="synergy-meme-plugin">'),
          )
        ) {
          return { system: input.system };
        }
        return { system: [...input.system, MEME_EXPRESSION_SYSTEM_PROMPT] };
      },
    }),
  ],
});

export default plugin;
