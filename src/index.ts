import type { PluginDescriptor, PluginHooks, PluginInput } from "@ericsanchezok/synergy-plugin"
import {
  PICK_TOOL_ID,
  PICK_TOOL_NAME,
  PLANNER_SUBAGENT_ID,
  PLUGIN_ID,
  SEARCH_TOOL_ID,
  SEARCH_TOOL_NAME,
} from "./constants"
import { createGenerateMemeTool } from "./tools/generate"
import { pickMeme } from "./tools/plan"
import { searchMemeTemplates } from "./tools/search"

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
          hidden: true,
          prompt: [
            "You are the hidden planner for Synergy Meme Plugin.",
            "Your job is to turn a meme request into a concrete validated meme plan.",
            "",
            "Rules:",
            "- Use search_meme_templates before choosing a template unless the prompt explicitly names one.",
            "- Use pick_meme to validate and normalize a candidate plan before submitting the final structured result.",
            "- Never call generate_meme.",
            "- Never delegate to another task.",
            "- Prefer the structured_task_result completion tool when it is available.",
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
    }
  },
}

export default plugin
