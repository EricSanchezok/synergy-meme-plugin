import { describe, expect, test } from "bun:test"
import path from "node:path"
import { createGenerateMemeTool } from "../src/tools/generate"
import { searchMemeTemplates } from "../src/tools/search"

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

describe("search_meme_templates", () => {
  test("finds common templates", async () => {
    const result = await searchMemeTemplates.execute({ query: "drake", limit: 5 }, context)
    expect(typeof result).toBe("object")
    const parsed = JSON.parse((result as any).output)
    expect(parsed.some((item: any) => item.id === "drake")).toBe(true)
  })
})

describe("generate_meme", () => {
  test("returns a helpful message for unknown templates", async () => {
    const tool = createGenerateMemeTool(fakeInput())
    const result = await tool.execute({ template: "missing-template", lines: ["a", "b"] }, context)
    expect((result as any).metadata.error).toBe("unknown_template")
    expect((result as any).attachments).toBeUndefined()
  })

  test("rejects too many lines", async () => {
    const tool = createGenerateMemeTool(fakeInput())
    const result = await tool.execute({ template: "drake", lines: ["a", "b", "c"] }, context)
    expect((result as any).title).toBe("Too many meme lines")
    expect((result as any).attachments).toBeUndefined()
  })

  test("uploads an artifact-only SVG attachment", async () => {
    const uploads: Array<{ file: File; text: string }> = []
    const tool = createGenerateMemeTool(fakeInput(uploads))
    const result = (await tool.execute({ template: "drake", lines: ["old way", "new way"] }, context)) as any

    expect(uploads).toHaveLength(1)
    expect(uploads[0].file.type).toBe("image/svg+xml")
    expect(uploads[0].text).toContain("<svg")
    expect(uploads[0].text).toContain("OLD WAY")
    expect(result.output).toBe("")
    expect(result.metadata.display.presentation).toBe("artifact-only")
    expect(result.attachments).toHaveLength(1)
    expect(result.attachments[0].url).toBe("asset://asset-test")
    expect(result.metadata.display.primaryAttachmentIds).toEqual([result.attachments[0].id])
  })
})
