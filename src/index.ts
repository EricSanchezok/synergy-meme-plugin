import type { PluginDescriptor, PluginHooks, PluginInput } from "@ericsanchezok/synergy-plugin"
import { createGenerateMemeTool } from "./tools/generate"
import { pickMeme } from "./tools/plan"
import { searchMemeTemplates } from "./tools/search"

const PLUGIN_ID = "synergy-meme-plugin"
const SEARCH_TOOL_ID = `plugin__${PLUGIN_ID}__search_meme_templates`
const PICK_TOOL_ID = `plugin__${PLUGIN_ID}__pick_meme`

export const plugin: PluginDescriptor = {
  id: PLUGIN_ID,
  name: "Synergy Meme Plugin",
  async init(input: PluginInput): Promise<PluginHooks> {
    return {
      agents: {
        "synergy-meme-planner": {
          name: "synergy-meme-planner",
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
        search_meme_templates: searchMemeTemplates,
        pick_meme: pickMeme,
      },
    }
  },
}

export default plugin
