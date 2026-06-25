import { describe, expect, test } from "bun:test"
import path from "node:path"
import { templateById } from "../src/data/templates.generated"
import { renderMemeSvg } from "../src/render/svg"

const pluginDir = path.resolve(import.meta.dir, "..")

describe("renderMemeSvg", () => {
  for (const id of ["drake", "db", "gb", "astronaut"]) {
    test(`renders ${id} as a self-contained SVG`, async () => {
      const template = templateById[id]
      expect(template).toBeDefined()

      const rendered = await renderMemeSvg({
        pluginDir,
        template,
        lines: Array.from({ length: Math.min(template.lines, 2) }, (_, index) => `line ${index + 1} <>&"`),
        layout: "default",
        captionCase: "uppercase",
      })

      expect(rendered.svg).toContain("<svg")
      expect(rendered.svg).toContain("data:image/jpeg;base64,")
      expect(rendered.svg).toContain("data:font/ttf;base64,")
      expect(rendered.svg).toContain("&lt;&gt;&amp;&quot;")
      expect(rendered.svg.toLocaleLowerCase()).not.toContain("<script")
      expect(rendered.svg).not.toMatch(/href=["']https?:/i)
      expect(rendered.svg).not.toMatch(/url\(["']https?:/i)
      expect(rendered.width).toBeGreaterThan(0)
      expect(rendered.height).toBeGreaterThan(0)
    })
  }
})
