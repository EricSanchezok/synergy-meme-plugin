import { describe, expect, test } from "bun:test";
import type {
  PluginHookPointInputs,
  HookContribution,
  PluginInvocationContext,
  PluginToolAttachment,
  ToolContribution,
} from "@ericsanchezok/synergy-plugin";
import plugin from "../src";

function contribution<Kind extends string>(kind: Kind, id: string) {
  const found = plugin.contributions.find(
    (candidate) => candidate.kind === kind && candidate.id === id,
  );
  expect(found).toBeDefined();
  return found;
}

function invocationContext(
  overrides: Partial<PluginInvocationContext> = {},
): PluginInvocationContext {
  return {
    requestId: "request-test",
    scopeId: "scope-test",
    sessionId: "session-test",
    runtime: {
      hostVersion: "test",
      pluginVersion: "0.4.0",
      pluginGeneration: "generation-test",
      protocolVersion: 9,
    },
    actor: {
      type: "agent",
      agent: "synergy",
      messageId: "message-test",
      callId: "call-test",
    },
    signal: new AbortController().signal,
    log: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
    events: {
      async publish() {},
    },
    ...overrides,
  };
}

describe("Plugin API 4 descriptor", () => {
  test("declares identity, capabilities, packaged assets, and flat contributions", () => {
    expect(plugin).toMatchObject({
      id: "synergy-meme-plugin",
      name: "Synergy Meme Plugin",
      version: "0.4.0",
      compatibility: { synergy: ">=3.0.11" },
      capabilities: [
        {
          id: "task.delegate",
          constraints: {
            agents: ["synergy-meme-planner"],
            maxRuntimeMs: 120_000,
          },
        },
        { id: "asset.write" },
      ],
      assets: [
        {
          source: "public/assets",
          target: "runtime/assets",
        },
      ],
    });
    expect(plugin.contributions.map(({ kind, id }) => `${kind}:${id}`)).toEqual(
      [
        "agent:synergy-meme-planner",
        "tool:generate_meme",
        "tool:search_meme_templates",
        "tool:pick_meme",
        "hook:meme-expression",
      ],
    );
    expect(plugin.handlerIds).toEqual([
      "tool:generate_meme",
      "tool:search_meme_templates",
      "tool:pick_meme",
      "hook:meme-expression",
    ]);
    expect(contribution("hook", "meme-expression")).toMatchObject({
      point: "chat.system.transform",
    });
    expect(contribution("tool", "generate_meme")).not.toHaveProperty(
      "exposure",
    );
  });

  test("keeps the planner hidden with only its two helper tools allowed", () => {
    expect(contribution("agent", "synergy-meme-planner")).toMatchObject({
      agent: {
        name: "synergy-meme-planner",
        mode: "subagent",
        modelRole: "mid",
        hidden: true,
        permission: {
          "*": "deny",
          "plugin__synergy-meme-plugin__search_meme_templates": "allow",
          "plugin__synergy-meme-plugin__pick_meme": "allow",
        },
      },
    });
    expect(contribution("tool", "search_meme_templates")).toMatchObject({
      exposure: { mode: "internal" },
    });
    expect(contribution("tool", "pick_meme")).toMatchObject({
      exposure: { mode: "internal" },
    });
  });

  test("returns a transformed system prompt only for primary agents", async () => {
    const transform = contribution(
      "hook",
      "meme-expression",
    ) as HookContribution<"chat.system.transform">;

    const base: PluginHookPointInputs["chat.system.transform"] = {
      phase: "final",
      sessionID: "session-test",
      agent: "synergy-max",
      model: { providerID: "test", modelID: "test-model" },
      system: ["Base system"],
    };
    const primary = await transform.handler(base, invocationContext());
    const duplicate = await transform.handler(
      { ...base, system: primary.system },
      invocationContext(),
    );
    const subagent = await transform.handler(
      { ...base, agent: "synergy-meme-planner" },
      invocationContext(),
    );

    expect(primary.system[0]).toBe("Base system");
    expect(primary.system.join("\n")).toContain("meme-expression");
    expect(primary.system.join("\n")).toContain("before a light task");
    expect(primary.system.join("\n")).toContain("clear emotional contrast");
    expect(primary.system.join("\n")).toContain(
      "do not limit meme use to engineering work",
    );
    expect(primary.system.join("\n")).toContain("sensitive topics");
    expect(primary.system.join("\n")).toContain(
      "Use at most once per short exchange",
    );
    expect(duplicate).toEqual(primary);
    expect(subagent).toEqual({ system: ["Base system"] });
  });
});

describe("Plugin API 4 generate_meme boundary", () => {
  test("uses native task.run and returns the host-owned asset attachment directly", async () => {
    const generatedAttachment: PluginToolAttachment = {
      type: "attachment",
      id: "part-test",
      sessionID: "session-test",
      messageID: "message-test",
      mime: "image/svg+xml",
      filename: "drake-test.svg",
      url: "asset://asset-test",
      presentation: { renderer: "image", size: "medium" },
    };
    const taskCalls: unknown[] = [];
    const assetCalls: Array<{
      data: string | Uint8Array;
      mime: string;
      filename?: string;
      presentation?: PluginToolAttachment["presentation"];
    }> = [];
    const context = invocationContext({
      task: {
        async run(input) {
          taskCalls.push(input);
          return {
            taskId: "task-test",
            sessionId: "child-session-test",
            status: "completed",
            owner: {
              pluginId: "synergy-meme-plugin",
              pluginGeneration: "generation-test",
              scopeId: "scope-test",
              correlationId: "request-test",
            },
            agent: "synergy-meme-planner",
            startedAt: 1,
            completedAt: 2,
            output: {
              mode: "structured",
              value: {
                template: "drake",
                lines: ["old way", "new way"],
                layout: "default",
                captionCase: "uppercase",
              },
            },
          };
        },
        async start() {
          throw new Error("generate_meme must use task.run");
        },
        async current() {
          return undefined;
        },
        async get() {
          throw new Error("generate_meme must use the task.run snapshot");
        },
        async cancel() {},
      },
      asset: {
        async create(input) {
          assetCalls.push(input);
          return generatedAttachment;
        },
      },
    });
    const generate = contribution("tool", "generate_meme") as ToolContribution<{
      prompt: string;
      template?: string;
      lines?: string[];
      style?: string;
      layout?: "default" | "top" | "center";
      captionCase?: "uppercase" | "preserve";
    }>;

    const result = await generate.handler(
      { prompt: "old way vs new way" },
      context,
    );

    expect(taskCalls).toHaveLength(1);
    expect(taskCalls[0]).toMatchObject({
      subagent: "synergy-meme-planner",
      visibility: "hidden",
      timeoutMs: 90_000,
      tools: {
        "*": false,
        "plugin__synergy-meme-plugin__search_meme_templates": true,
        "plugin__synergy-meme-plugin__pick_meme": true,
      },
      output: { mode: "structured", maxRepairTurns: 3 },
    });
    expect(assetCalls).toHaveLength(1);
    expect(assetCalls[0]).toMatchObject({
      mime: "image/svg+xml",
      presentation: { renderer: "image", size: "medium" },
    });
    expect(assetCalls[0].data).toContain("<svg");
    expect(assetCalls[0].data).toContain("OLD WAY");
    expect(result).toMatchObject({
      metadata: {
        template: "drake",
        planner: "subagent",
        assetId: "part-test",
      },
      attachments: [generatedAttachment],
    });
  });
});
