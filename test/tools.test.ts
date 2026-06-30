import { describe, expect, test } from "bun:test"
import path from "node:path"
import { plugin } from "../src"
import { createGenerateMemeTool } from "../src/tools/generate"
import { pickMeme } from "../src/tools/plan"
import { findMemeTemplates, searchMemeTemplates } from "../src/tools/search"

const pluginDir = path.resolve(import.meta.dir, "..")

function fakeInput(uploads: Array<{ file: File; text: string }> = []) {
  return {
    pluginDir,
    client: {
      asset: {
        upload: async ({ file }: { file: File }) => {
          uploads.push({ file, text: await file.text() })
          return {
            data: {
              id: "asset-test",
              url: "asset://asset-test",
              mime: file.type,
              size: file.size,
            },
          }
        },
      },
    },
  } as any
}

const context = {
  sessionID: "session-test",
  messageID: "message-test",
  agent: "synergy",
  abort: new AbortController().signal,
}

describe("internal template search", () => {
  test("finds common templates", async () => {
    const result = findMemeTemplates({ query: "drake", limit: 5 })
    expect(result.some((item) => item.id === "drake")).toBe(true)
  })

  test("expands Chinese developer debugging prompts into useful candidates", async () => {
    const result = findMemeTemplates({
      query: "程序员debug半天发现是少了个分号，崩溃又释然的表情包",
      limit: 8,
    })
    const ids = result.map((item) => item.id)
    expect(ids.length).toBeGreaterThanOrEqual(5)
    expect(ids).toContain("scc")
    expect(ids).toContain("facepalm")
    expect(ids).not.toContain("cbb")
  })

  test("returns a diverse classic set for random prompts", async () => {
    const ids = findMemeTemplates({ query: "随便生成一个", limit: 8 }).map(
      (item) => item.id,
    )
    expect(ids.length).toBeGreaterThanOrEqual(5)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("does not return empty results for Chinese prompts without known keywords", async () => {
    const ids = findMemeTemplates({
      query: "完全没有英文关键词的奇怪中文需求",
      lineCount: 1,
      limit: 5,
    }).map((item) => item.id)
    expect(ids.length).toBeGreaterThanOrEqual(3)
  })

  test("treats unknown semantic style as a search hint instead of an empty hard filter", async () => {
    const ids = findMemeTemplates({
      query: "程序员 debug 半天发现少了个分号",
      style: "debug",
      limit: 6,
    }).map((item) => item.id)
    expect(ids.length).toBeGreaterThanOrEqual(5)
    expect(ids).toEqual(expect.arrayContaining(["facepalm", "scc", "fine"]))
    expect(ids[0]).not.toBe("doge")
  })

  test("prioritizes product and deployment work scenarios over generic defaults", async () => {
    const productIds = findMemeTemplates({
      query: "产品需求又改了",
      limit: 6,
    }).map((item) => item.id)
    expect(productIds.slice(0, 4)).toEqual(
      expect.arrayContaining(["gru", "fine", "badchoice", "facepalm"]),
    )
    expect(productIds[0]).not.toBe("doge")
    expect(productIds[0]).not.toBe("noidea")

    const deployIds = findMemeTemplates({
      query: "CI 过了但线上挂了",
      limit: 6,
    }).map((item) => item.id)
    expect(deployIds.slice(0, 4)).toEqual(
      expect.arrayContaining([
        "fine",
        "disastergirl",
        "crazypills",
        "facepalm",
      ]),
    )
    expect(deployIds[0]).not.toBe("doge")
  })

  test("understands partial-understanding and underestimated-work prompts", async () => {
    const understandingIds = findMemeTemplates({
      query: "做一个我懂了但没完全懂的表情包",
      limit: 6,
    }).map((item) => item.id)
    expect(understandingIds.slice(0, 4)).toEqual(
      expect.arrayContaining(["scc", "fry", "astronaut"]),
    )

    const workIds = findMemeTemplates({
      query: "老板说很简单实际搞了三天",
      limit: 6,
    }).map((item) => item.id)
    expect(workIds.slice(0, 4)).toEqual(
      expect.arrayContaining(["gru", "badchoice", "fine", "harold"]),
    )
  })

  test("treats line count as a preference for planner search", async () => {
    const result = findMemeTemplates({
      query: "完全没有英文关键词的奇怪中文需求",
      lineCount: 3,
      limit: 6,
    })
    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(result.some((item) => item.lines !== 3)).toBe(true)
  })

  test("planner search output includes ranking guidance", async () => {
    const result = (await searchMemeTemplates.execute(
      {
        query: "程序员 debug 半天发现少了个分号",
        limit: 3,
      },
      context,
    )) as any
    const payload = JSON.parse(result.output)
    expect(payload.candidates).toHaveLength(3)
    expect(payload.candidates[0].score).toBeGreaterThan(0)
    expect(payload.candidates[0].bestFor.length).toBeGreaterThan(0)
  })
})

describe("plugin descriptor", () => {
  test("exposes generate_meme publicly and internal planner helpers", async () => {
    const hooks = await plugin.init(fakeInput())
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual([
      "generate_meme",
      "pick_meme",
      "search_meme_templates",
    ])
    expect((hooks.tool?.search_meme_templates as any).exposure).toEqual({
      mode: "internal",
    })
    expect((hooks.tool?.pick_meme as any).exposure).toEqual({
      mode: "internal",
    })
    expect(hooks.agents?.["synergy-meme-planner"]?.hidden).toBe(true)
  })
})

describe("planner helpers", () => {
  test("pick_meme validates and returns a normalized plan", async () => {
    const result = (await pickMeme.execute(
      {
        template: "drake",
        lines: ["old plugin flow", "new planner flow"],
      },
      context,
    )) as any
    expect(JSON.parse(result.output)).toMatchObject({
      template: "drake",
      lines: ["old plugin flow", "new planner flow"],
      layout: "default",
      captionCase: "uppercase",
    })
  })

  test("pick_meme drops semantic styles that are not native memegen styles", async () => {
    const result = (await pickMeme.execute(
      {
        template: "scc",
        lines: ["debug 半天", "少了分号"],
        style: "debug",
      },
      context,
    )) as any
    const plan = JSON.parse(result.output)
    expect(plan.template).toBe("scc")
    expect(plan.style).toBeUndefined()
  })
})

describe("generate_meme", () => {
  test("falls back when an optional template id is unknown", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const result = (await tool.execute(
      {
        prompt: "old frontend chaos vs new frontend kit",
        template: "missing-template",
      },
      context,
    )) as any
    expect(result.metadata.requestedTemplate).toBe("missing-template")
    expect(result.metadata.template).not.toBe("missing-template")
    expect(result.attachments).toHaveLength(1)
    expect(uploads).toHaveLength(1)
  })

  test("rejects too many lines", async () => {
    const tool = createGenerateMemeTool(fakeInput())
    const result = await tool.execute(
      { prompt: "too many lines", template: "drake", lines: ["a", "b", "c"] },
      context,
    )
    expect((result as any).title).toBe("Too many meme lines")
    expect((result as any).attachments).toBeUndefined()
  })

  test("prompt fallback avoids templates with too few lines when explicit lines are provided", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const result = (await tool.execute(
      {
        prompt: "完全没有英文关键词的奇怪中文需求",
        lines: ["第一行", "第二行", "第三行"],
      },
      context,
    )) as any

    expect(result.attachments).toHaveLength(1)
    expect(result.metadata.lines).toHaveLength(3)
  })

  test("uploads a media-generation artifact-only SVG attachment", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const result = (await tool.execute(
      {
        prompt: "old way vs new way",
        template: "drake",
        lines: ["old way", "new way"],
      },
      context,
    )) as any

    expect(uploads).toHaveLength(1)
    expect(uploads[0].file.type).toBe("image/svg+xml")
    expect(uploads[0].text).toContain("<svg")
    expect(uploads[0].text).toContain("OLD WAY")
    expect(result.output).toBe("")
    expect(result.metadata.display.kind).toBe("media-generation")
    expect(result.metadata.display.visibility).toBe("media")
    expect(result.metadata.display.presentation).toBe("artifact-only")
    expect(result.metadata.display.media).toEqual({
      type: "image",
      aspectRatio: "1:1",
    })
    expect(result.attachments).toHaveLength(1)
    expect(result.attachments[0].url).toBe("asset://asset-test")
    expect(result.metadata.display.primaryAttachmentIds).toEqual([
      result.attachments[0].id,
    ])
  })

  test("uses hidden planner task when host task service is available", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const calls: Array<any> = []
    const result = (await tool.execute(
      {
        prompt: "legacy scattered tools vs one polished meme tool",
      },
      {
        ...context,
        task: {
          run: async (input: any) => {
            calls.push(input)
            return {
              taskId: "cortex-test",
              sessionId: "session-child",
              status: "completed",
              output: "trajectory summary",
              outputResult: {
                mode: "structured",
                status: "valid",
                source: "structured_tool",
                data: {
                  template: "drake",
                  lines: ["scattered tools", "one polished tool"],
                  layout: "default",
                  captionCase: "uppercase",
                },
                repairTurns: 0,
              },
            }
          },
        },
      } as any,
    )) as any

    expect(calls).toHaveLength(1)
    expect(calls[0].subagent).toBe("synergy-meme-planner")
    expect(calls[0].visibility).toBe("hidden")
    expect(calls[0].timeoutMs).toBe(90_000)
    expect(calls[0].tools["*"]).toBe(false)
    expect(
      calls[0].tools["plugin__synergy-meme-plugin__search_meme_templates"],
    ).toBe(true)
    expect(calls[0].tools["plugin__synergy-meme-plugin__pick_meme"]).toBe(true)
    expect(calls[0].output.mode).toBe("structured")
    expect(calls[0].output.maxRepairTurns).toBe(3)
    expect(result.metadata.planner).toBe("subagent")
    expect(uploads[0].text).toContain("SCATTERED TOOLS")
  })

  test("ignores unsupported planner style and still renders the selected meme", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const result = (await tool.execute(
      {
        prompt: "程序员 debug 半天发现少了个分号",
      },
      {
        ...context,
        task: {
          run: async () => ({
            taskId: "cortex-test",
            sessionId: "session-child",
            status: "completed",
            output: "trajectory summary",
            outputResult: {
              mode: "structured",
              status: "valid",
              source: "structured_tool",
              data: {
                template: "scc",
                lines: ["DEBUG 半天", "少了分号"],
                style: "debug",
                layout: "default",
                captionCase: "uppercase",
              },
              repairTurns: 0,
            },
          }),
        },
      } as any,
    )) as any

    expect(result.attachments).toHaveLength(1)
    expect(result.metadata.template).toBe("scc")
    expect(result.metadata.style).toBe("default")
    expect(uploads[0].text).toContain("少了分号")
  })

  test("generates from prompt only", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const result = (await tool.execute(
      { prompt: "shipping a plugin market with one command" },
      context,
    )) as any

    expect(result.attachments).toHaveLength(1)
    expect(typeof result.metadata.template).toBe("string")
    expect(uploads[0].text).toContain("<svg")
  })
})
