import { describe, expect, test } from "bun:test"
import path from "node:path"
import { plugin } from "../src"
import { createGenerateMemeTool } from "../src/tools/generate"
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
})

describe("plugin descriptor", () => {
  test("exposes only generate_meme", async () => {
    const hooks = await plugin.init(fakeInput())
    expect(Object.keys(hooks.tool ?? {})).toEqual(["generate_meme"])
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
    expect(result.attachments).toHaveLength(1)
    expect(result.attachments[0].url).toBe("asset://asset-test")
    expect(result.metadata.display.primaryAttachmentIds).toEqual([result.attachments[0].id])
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
