import { describe, expect, test } from "bun:test";
import type {
  PluginAssetCreateInput,
  HookContribution,
  PluginHookPointInputs,
  PluginInvocationContext,
  PluginTaskSnapshot,
  PluginToolAttachment,
  PluginToolResult,
  TaskHostService,
  ToolContribution,
} from "@ericsanchezok/synergy-plugin";
import { plugin } from "../src";
import { generateMeme } from "../src/tools/generate";
import { pickMeme } from "../src/tools/plan";
import { findMemeTemplates, searchMemeTemplates } from "../src/tools/search";

type CreatedAsset = {
  input: PluginAssetCreateInput;
  text: string;
  attachment: PluginToolAttachment;
};

function invocationContext(
  createdAssets: CreatedAsset[] = [],
  task?: TaskHostService,
): PluginInvocationContext {
  return {
    requestId: "request-test",
    scopeId: "scope-test",
    sessionId: "session-test",
    runtime: {
      hostVersion: "test",
      pluginVersion: "0.3.9",
      pluginGeneration: "generation-test",
      protocolVersion: 5,
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
    task,
    asset: {
      async create(input) {
        const text =
          typeof input.data === "string"
            ? input.encoding === "base64"
              ? Buffer.from(input.data, "base64").toString("utf8")
              : input.data
            : Buffer.from(input.data).toString("utf8");
        const attachment: PluginToolAttachment = {
          type: "attachment",
          id: "asset-test",
          sessionID: "session-test",
          messageID: "message-test",
          mime: input.mime,
          filename: input.filename,
          url: "asset://asset-test",
          presentation: input.presentation,
          model: input.model,
          metadata: input.metadata,
        };
        createdAssets.push({ input, text, attachment });
        return attachment;
      },
    },
  };
}

function taskService(run: TaskHostService["run"]): TaskHostService {
  return {
    async start() {
      throw new Error("Tests expect generate_meme to use task.run");
    },
    run,
    async current() {
      return undefined;
    },
    async get() {
      throw new Error("Tests expect generate_meme to consume task.run output");
    },
    async cancel() {},
  };
}

async function invokeTool<Input>(
  contribution: ToolContribution<Input>,
  input: Input,
  context = invocationContext(),
): Promise<PluginToolResult> {
  const output = await contribution.handler(input, context);
  return typeof output === "string" ? { output } : output;
}

function contribution(kind: string, id: string) {
  const found = plugin.contributions.find(
    (candidate) => candidate.kind === kind && candidate.id === id,
  );
  expect(found).toBeDefined();
  return found;
}

function completedPlan(value: unknown): PluginTaskSnapshot {
  return {
    taskId: "cortex-test",
    sessionId: "session-child",
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
    output: { mode: "structured", value },
  };
}

describe("internal template search", () => {
  test("finds common templates", () => {
    const result = findMemeTemplates({ query: "drake", limit: 5 });
    expect(result.some((template) => template.id === "drake")).toBe(true);
  });

  test("expands Chinese developer debugging prompts into useful candidates", () => {
    const result = findMemeTemplates({
      query: "程序员debug半天发现是少了个分号，崩溃又释然的表情包",
      limit: 8,
    });
    const ids = result.map((template) => template.id);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(ids).toContain("scc");
    expect(ids).toContain("facepalm");
    expect(ids).not.toContain("cbb");
  });

  test("returns a diverse classic set for random prompts", () => {
    const ids = findMemeTemplates({ query: "随便生成一个", limit: 8 }).map(
      (template) => template.id,
    );
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("does not return empty results for Chinese prompts without known keywords", () => {
    const ids = findMemeTemplates({
      query: "完全没有英文关键词的奇怪中文需求",
      lineCount: 1,
      limit: 5,
    }).map((template) => template.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  test("treats unknown semantic style as a search hint instead of an empty hard filter", () => {
    const ids = findMemeTemplates({
      query: "程序员 debug 半天发现少了个分号",
      style: "debug",
      limit: 6,
    }).map((template) => template.id);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(ids.includes("scc") || ids.includes("facepalm")).toBe(true);
    expect(ids[0]).not.toBe("doge");
  });

  test("prioritizes product and deployment work scenarios over generic defaults", () => {
    const productIds = findMemeTemplates({
      query: "产品需求又改了",
      limit: 6,
    }).map((template) => template.id);
    expect(productIds.length).toBeGreaterThanOrEqual(5);
    expect(productIds[0]).not.toBe("doge");
    expect(productIds[0]).not.toBe("noidea");

    const deployIds = findMemeTemplates({
      query: "CI 过了但线上挂了",
      limit: 6,
    }).map((template) => template.id);
    expect(deployIds.slice(0, 2)).toEqual(
      expect.arrayContaining(["fine", "disastergirl"]),
    );
    expect(deployIds[0]).not.toBe("doge");
  });

  test("understands partial-understanding and underestimated-work prompts", () => {
    const understandingIds = findMemeTemplates({
      query: "做一个我懂了但没完全懂的表情包",
      limit: 6,
    }).map((template) => template.id);
    expect(understandingIds.slice(0, 4).includes("scc")).toBe(true);

    const workIds = findMemeTemplates({
      query: "老板说很简单实际搞了三天",
      limit: 6,
    }).map((template) => template.id);
    const hasWorkTemplate = [
      "gru",
      "badchoice",
      "fine",
      "harold",
      "dbg",
      "facepalm",
    ].some((id) => workIds.includes(id));
    expect(hasWorkTemplate).toBe(true);
  });

  test("treats line count as a preference for planner search", () => {
    const result = findMemeTemplates({
      query: "完全没有英文关键词的奇怪中文需求",
      lineCount: 3,
      limit: 6,
    });
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.some((template) => template.lines !== 3)).toBe(true);
  });

  test("planner search output includes ranking guidance", async () => {
    const result = await invokeTool(
      searchMemeTemplates,
      {
        query: "程序员 debug 半天发现少了个分号",
        limit: 3,
      },
      invocationContext(),
    );
    const payload = JSON.parse(result.output) as {
      candidates: Array<{ score: number; bestFor: string }>;
    };
    expect(payload.candidates).toHaveLength(3);
    expect(payload.candidates[0].score).toBeGreaterThan(0);
    expect(payload.candidates[0].bestFor.length).toBeGreaterThan(0);
  });
});

describe("plugin descriptor", () => {
  test("exposes generate_meme publicly and internal planner helpers", () => {
    expect(
      plugin.contributions
        .filter((candidate) => candidate.kind === "tool")
        .map((candidate) => candidate.id)
        .sort(),
    ).toEqual(["generate_meme", "pick_meme", "search_meme_templates"]);
    expect(contribution("tool", "search_meme_templates")).toMatchObject({
      exposure: { mode: "internal" },
    });
    expect(contribution("tool", "pick_meme")).toMatchObject({
      exposure: { mode: "internal" },
    });
    expect(contribution("agent", "synergy-meme-planner")).toMatchObject({
      agent: { hidden: true },
    });
  });

  test("injects meme expression prompt only for primary agents", async () => {
    const transform = contribution(
      "hook",
      "meme-expression",
    ) as HookContribution<"experimental.chat.system.transform">;
    const primaryInput: PluginHookPointInputs["experimental.chat.system.transform"] =
      {
        phase: "final",
        sessionID: "session-test",
        agent: "synergy-max",
        model: { providerID: "test", modelID: "test-model" },
        system: [],
      };
    const primary = await transform.handler(primaryInput, invocationContext());
    const subagent = await transform.handler(
      { ...primaryInput, agent: "synergy-meme-planner" },
      invocationContext(),
    );

    const prompt = primary.system.join("\n");
    expect(prompt).toContain("meme-expression");
    expect(prompt).toContain("before a light task");
    expect(prompt).toContain("clear emotional contrast");
    expect(prompt).toContain("do not limit meme use to engineering work");
    expect(prompt).toContain("sensitive topics");
    expect(prompt).toContain("Use at most once per short exchange");
    expect(subagent.system).toHaveLength(0);
  });
});

describe("planner helpers", () => {
  test("pick_meme validates and returns a normalized plan", async () => {
    const result = await invokeTool(
      pickMeme,
      {
        template: "drake",
        lines: ["old plugin flow", "new planner flow"],
      },
      invocationContext(),
    );
    expect(JSON.parse(result.output)).toMatchObject({
      template: "drake",
      lines: ["old plugin flow", "new planner flow"],
      layout: "default",
      captionCase: "uppercase",
    });
  });

  test("pick_meme drops semantic styles that are not native memegen styles", async () => {
    const result = await invokeTool(
      pickMeme,
      {
        template: "scc",
        lines: ["debug 半天", "少了分号"],
        style: "debug",
      },
      invocationContext(),
    );
    const plan = JSON.parse(result.output) as {
      template: string;
      style?: string;
    };
    expect(plan.template).toBe("scc");
    expect(plan.style).toBeUndefined();
  });
});

describe("generate_meme", () => {
  test("falls back when an optional template id is unknown", async () => {
    const createdAssets: CreatedAsset[] = [];
    const result = await invokeTool(
      generateMeme,
      {
        prompt: "old frontend chaos vs new frontend kit",
        template: "missing-template",
      },
      invocationContext(createdAssets),
    );
    expect(result.metadata?.requestedTemplate).toBe("missing-template");
    expect(result.metadata?.template).not.toBe("missing-template");
    expect(result.attachments).toHaveLength(1);
    expect(createdAssets).toHaveLength(1);
  });

  test("rejects too many lines", async () => {
    const result = await invokeTool(
      generateMeme,
      {
        prompt: "too many lines",
        template: "drake",
        lines: ["a", "b", "c"],
      },
      invocationContext(),
    );
    expect(result.title).toBe("Too many meme lines");
    expect(result.attachments).toBeUndefined();
  });

  test("prompt fallback avoids templates with too few lines when explicit lines are provided", async () => {
    const result = await invokeTool(
      generateMeme,
      {
        prompt: "完全没有英文关键词的奇怪中文需求",
        lines: ["第一行", "第二行", "第三行"],
      },
      invocationContext(),
    );
    expect(result.attachments).toHaveLength(1);
    expect(result.metadata?.lines).toHaveLength(3);
  });

  test("creates a hidden-card media-generation SVG attachment", async () => {
    const createdAssets: CreatedAsset[] = [];
    const result = await invokeTool(
      generateMeme,
      {
        prompt: "old way vs new way",
        template: "drake",
        lines: ["old way", "new way"],
      },
      invocationContext(createdAssets),
    );

    expect(createdAssets).toHaveLength(1);
    expect(createdAssets[0].input.mime).toBe("image/svg+xml");
    expect(createdAssets[0].text).toContain("<svg");
    expect(createdAssets[0].text).toContain("OLD WAY");
    expect(result.output).toContain('Generated meme "Drakeposting" (drake)');
    expect(result.metadata?.display).toMatchObject({
      kind: "media-generation",
      toolCard: "hidden",
      media: { type: "image", aspectRatio: "auto", size: "medium" },
    });
    expect(result.attachments).toEqual([createdAssets[0].attachment]);
    expect(result.attachments?.[0].url).toBe("asset://asset-test");
    expect(result.attachments?.[0].presentation).toEqual({
      renderer: "image",
      size: "medium",
    });
  });

  test("uses hidden planner task when host task service is available", async () => {
    const createdAssets: CreatedAsset[] = [];
    const calls: Parameters<TaskHostService["run"]>[0][] = [];
    const result = await invokeTool(
      generateMeme,
      { prompt: "legacy scattered tools vs one polished meme tool" },
      invocationContext(
        createdAssets,
        taskService(async (input) => {
          calls.push(input);
          return completedPlan({
            template: "drake",
            lines: ["scattered tools", "one polished tool"],
            layout: "default",
            captionCase: "uppercase",
          });
        }),
      ),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].subagent).toBe("synergy-meme-planner");
    expect(calls[0].visibility).toBe("hidden");
    expect(calls[0].timeoutMs).toBe(90_000);
    expect(calls[0].tools?.["*"]).toBe(false);
    expect(
      calls[0].tools?.["plugin__synergy-meme-plugin__search_meme_templates"],
    ).toBe(true);
    expect(calls[0].tools?.["plugin__synergy-meme-plugin__pick_meme"]).toBe(
      true,
    );
    expect(calls[0].output).toMatchObject({
      mode: "structured",
      maxRepairTurns: 3,
    });
    expect(result.metadata?.planner).toBe("subagent");
    expect(createdAssets[0].text).toContain("SCATTERED");
    expect(createdAssets[0].text).toContain("TOOLS");
  });

  test("ignores unsupported planner style and still renders the selected meme", async () => {
    const createdAssets: CreatedAsset[] = [];
    const result = await invokeTool(
      generateMeme,
      { prompt: "程序员 debug 半天发现少了个分号" },
      invocationContext(
        createdAssets,
        taskService(async () =>
          completedPlan({
            template: "scc",
            lines: ["DEBUG 半天", "少了分号"],
            style: "debug",
            layout: "default",
            captionCase: "uppercase",
          }),
        ),
      ),
    );

    expect(result.attachments).toHaveLength(1);
    expect(result.metadata?.template).toBe("scc");
    expect(result.metadata?.style).toBe("default");
    expect(createdAssets[0].text).toContain("少了分号");
  });

  test("falls back when a terminal task snapshot has no structured output", async () => {
    const createdAssets: CreatedAsset[] = [];
    const result = await invokeTool(
      generateMeme,
      {
        prompt: "terminal snapshot without structured output falls back safely",
      },
      invocationContext(
        createdAssets,
        taskService(async () => {
          const snapshot = completedPlan(undefined);
          return { ...snapshot, output: undefined };
        }),
      ),
    );

    expect(result.attachments).toHaveLength(1);
    expect(result.metadata?.planner).toBe("fallback");
    expect(createdAssets[0].text).not.toContain("LEGACY SHAPE");
  });

  test("generates from prompt only", async () => {
    const createdAssets: CreatedAsset[] = [];
    const result = await invokeTool(
      generateMeme,
      { prompt: "shipping a plugin market with one command" },
      invocationContext(createdAssets),
    );

    expect(result.attachments).toHaveLength(1);
    expect(typeof result.metadata?.template).toBe("string");
    expect(createdAssets[0].text).toContain("<svg");
  });
});
