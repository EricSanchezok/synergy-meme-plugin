import { describe, expect, test } from "bun:test"
import path from "node:path"
import { plugin } from "../src"
import { createGenerateMemeTool } from "../src/tools/generate"
import { pickMeme } from "../src/tools/plan"
import { findMemeTemplates } from "../src/tools/search"

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
    const ids = findMemeTemplates({ query: "随便生成一个", limit: 8 }).map((item) => item.id)
    expect(ids.length).toBeGreaterThanOrEqual(5)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("does not return empty results for Chinese prompts without known keywords", async () => {
    const ids = findMemeTemplates({ query: "完全没有英文关键词的奇怪中文需求", lineCount: 1, limit: 5 }).map(
      (item) => item.id,
    )
    expect(ids.length).toBeGreaterThanOrEqual(3)
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
})

describe("plugin descriptor", () => {
  test("exposes generate_meme publicly and internal planner helpers", async () => {
    const hooks = await plugin.init(fakeInput())
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(["generate_meme", "pick_meme", "search_meme_templates"])
    expect((hooks.tool?.search_meme_templates as any).exposure).toEqual({ mode: "internal" })
    expect((hooks.tool?.pick_meme as any).exposure).toEqual({ mode: "internal" })
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
    const result = await tool.execute({ prompt: "too many lines", template: "drake", lines: ["a", "b", "c"] }, context)
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
    expect(result.metadata.display.media).toEqual({ type: "image", aspectRatio: "1:1" })
    expect(result.attachments).toHaveLength(1)
    expect(result.attachments[0].url).toBe("asset://asset-test")
    expect(result.metadata.display.primaryAttachmentIds).toEqual([result.attachments[0].id])
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
    expect(calls[0].timeoutMs).toBe(120_000)
    expect(calls[0].tools["*"]).toBe(false)
    expect(calls[0].tools["plugin__synergy-meme-plugin__search_meme_templates"]).toBe(true)
    expect(calls[0].tools["plugin__synergy-meme-plugin__pick_meme"]).toBe(true)
    expect(calls[0].output.mode).toBe("structured")
    expect(calls[0].output.maxRepairTurns).toBe(3)
    expect(result.metadata.planner).toBe("subagent")
    expect(uploads[0].text).toContain("SCATTERED TOOLS")
  })

  test("generates from prompt only", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const result = (await tool.execute({ prompt: "shipping a plugin market with one command" }, context)) as any

    expect(result.attachments).toHaveLength(1)
    expect(typeof result.metadata.template).toBe("string")
    expect(uploads[0].text).toContain("<svg")
  })
})
