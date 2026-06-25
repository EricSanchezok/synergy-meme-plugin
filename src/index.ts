import type { PluginDescriptor, PluginHooks, PluginInput } from "@ericsanchezok/synergy-plugin"
import { createGenerateMemeTool } from "./tools/generate"

export const plugin: PluginDescriptor = {
  id: "synergy-meme-plugin",
  name: "Synergy Meme Plugin",
  async init(input: PluginInput): Promise<PluginHooks> {
    return {
      tool: {
        generate_meme: createGenerateMemeTool(input),
      },
    }
  },
}

export default plugin
