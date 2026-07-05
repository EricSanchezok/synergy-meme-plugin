import { describe, expect, test } from "bun:test";
import path from "node:path";
import { templateById } from "../src/data/templates.generated";
import { renderMemeSvg } from "../src/render/svg";

const pluginDir = path.resolve(import.meta.dir, "..");

function textRows(svg: string) {
  return [
    ...svg.matchAll(/<text\b[^>]*font-size="(\d+)"[^>]*>(.*?)<\/text>/g),
  ].map((match) => ({
    size: Number(match[1]),
    text: match[2],
  }));
}

function cjkSafeEstimatedWidth(value: string, fontSize: number) {
  let weight = 0;
  for (const char of [...value]) {
    if (/\s/u.test(char)) weight += 0.34;
    else if (
      /[\u2E80-\u9FFF\uAC00-\uD7AF\u3040-\u30FF\uFF00-\uFFEF]/u.test(char)
    )
      weight += 1;
    else if (char.codePointAt(0)! > 0xffff) weight += 1.05;
    else if (/[il.,'`|!]/u.test(char)) weight += 0.3;
    else if (/[mwMW@#%&]/u.test(char)) weight += 0.9;
    else weight += 0.64;
  }
  return weight * fontSize * 0.82;
}

describe("renderMemeSvg", () => {
  for (const id of ["drake", "db", "gb", "astronaut"]) {
    test(`renders ${id} as a self-contained SVG`, async () => {
      const template = templateById[id];
      expect(template).toBeDefined();

      const rendered = await renderMemeSvg({
        pluginDir,
        template,
        lines: Array.from(
          { length: Math.min(template.lines, 2) },
          (_, index) => `line ${index + 1} <>&"`,
        ),
        layout: "default",
        captionCase: "uppercase",
      });

      expect(rendered.svg).toContain("<svg");
      expect(rendered.svg).toContain("data:image/jpeg;base64,");
      expect(rendered.svg).toContain("data:font/ttf;base64,");
      expect(rendered.svg).toContain("&lt;&gt;&amp;&quot;");
      expect(rendered.svg.toLocaleLowerCase()).not.toContain("<script");
      expect(rendered.svg).not.toMatch(/href=["']https?:/i);
      expect(rendered.svg).not.toMatch(/url\(["']https?:/i);
      expect(rendered.width).toBeGreaterThan(0);
      expect(rendered.height).toBeGreaterThan(0);
    });
  }

  test("wraps long Chinese Drake captions inside the right-side text regions", async () => {
    const template = templateById.drake;
    const rendered = await renderMemeSvg({
      pluginDir,
      template,
      lines: ["还在用官方缓存包 调试半天不生效", "切到本地路径 立刻跑通"],
      layout: "default",
      captionCase: "uppercase",
    });
    const rows = textRows(rendered.svg);

    expect(rows.length).toBeGreaterThan(2);
    expect(
      rows.every(
        (row) =>
          cjkSafeEstimatedWidth(row.text, row.size) <= template.width * 0.44,
      ),
    ).toBe(true);
    expect(rendered.svg).toContain("还在用官方");
    expect(rendered.svg).toContain("切到本地");
  });

  test("wraps Chinese text without natural spaces", async () => {
    const template = templateById.drake;
    const rendered = await renderMemeSvg({
      pluginDir,
      template,
      lines: ["完全没有空格但是非常长的中文需求应该自动换行", "短句"],
      layout: "default",
      captionCase: "preserve",
    });
    const rows = textRows(rendered.svg);

    expect(rows.length).toBeGreaterThan(2);
    expect(rows.some((row) => row.text.includes("完全没有"))).toBe(true);
    expect(
      rows.every(
        (row) =>
          cjkSafeEstimatedWidth(row.text, row.size) <= template.width * 0.44,
      ),
    ).toBe(true);
  });
});
