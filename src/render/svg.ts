import path from "node:path";
import type { MemeTemplate } from "../data/types";
import { type TextRegion, textRegions } from "./layout-overrides";

export interface RenderMemeInput {
  pluginDir: string;
  template: MemeTemplate;
  lines: string[];
  layout: "default" | "top" | "center";
  captionCase: "uppercase" | "preserve";
}

export interface RenderedMeme {
  svg: string;
  width: number;
  height: number;
}

const FONT_FAMILY = "SynergyMemeAnton";
const WIDTH_UNIT = 0.82;
const MIN_FONT_SIZE = 16;

async function firstExisting(paths: string[], label: string) {
  for (const candidate of paths) {
    if (await Bun.file(candidate).exists()) return candidate;
  }
  throw new Error(
    `${label} not found. Run "bun run sync:templates" and rebuild the plugin.`,
  );
}

async function dataUri(filepath: string, mime: string) {
  const bytes = Buffer.from(await Bun.file(filepath).arrayBuffer());
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function graphemes(value: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return [...segmenter.segment(value)].map((segment) => segment.segment);
  }
  return [...value];
}

function isCjk(char: string) {
  return /[\u2E80-\u9FFF\uAC00-\uD7AF\u3040-\u30FF\uFF00-\uFFEF]/u.test(char);
}

function charWeight(char: string) {
  if (/\s/u.test(char)) return 0.34;
  if (isCjk(char)) return 1;
  if (char.codePointAt(0)! > 0xffff) return 1.05;
  if (/[il.,'`|!]/u.test(char)) return 0.3;
  if (/[mwMW@#%&]/u.test(char)) return 0.9;
  return 0.64;
}

function weightedLength(value: string) {
  return graphemes(value).reduce((sum, char) => sum + charWeight(char), 0);
}

function estimatedWidth(value: string, fontSize: number) {
  return weightedLength(value) * fontSize * WIDTH_UNIT;
}

function splitLongToken(token: string, maxWidth: number, fontSize: number) {
  const chunks: string[] = [];
  let current = "";
  for (const char of graphemes(token)) {
    const next = current + char;
    if (current && estimatedWidth(next, fontSize) > maxWidth) {
      chunks.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function tokensForWrapping(value: string, maxWidth: number, fontSize: number) {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const tokens = words.length > 0 ? words : [value.trim()];
  return tokens.flatMap((token) =>
    estimatedWidth(token, fontSize) > maxWidth
      ? splitLongToken(token, maxWidth, fontSize)
      : [token],
  );
}

function wrapText(value: string, maxWidth: number, fontSize: number) {
  const tokens = tokensForWrapping(value, maxWidth, fontSize);
  if (tokens.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const token of tokens) {
    const separator = current && /\s/u.test(value) ? " " : "";
    const next = current ? `${current}${separator}${token}` : token;
    if (current && estimatedWidth(next, fontSize) > maxWidth) {
      lines.push(current);
      current = token;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function baseFontSize(input: { width: number; height: number; scale: number }) {
  return Math.max(
    24,
    Math.round(Math.min(input.width, input.height) * 0.078 * input.scale),
  );
}

function defaultRegionHeight(regionCount: number) {
  if (regionCount <= 1) return 0.18;
  if (regionCount === 2) return 0.18;
  return 0.14;
}

function clampWithEllipsis(lines: string[], maxRows: number) {
  if (lines.length <= maxRows) return lines;
  const kept = lines.slice(0, Math.max(1, maxRows));
  const last = kept[kept.length - 1] ?? "";
  kept[kept.length - 1] = `${last.replace(/…$/u, "")}…`;
  return kept;
}

function fitText(input: {
  text: string;
  width: number;
  height: number;
  region: TextRegion;
  regionCount: number;
  regionWidth: number;
}) {
  const regionHeight = Math.max(
    MIN_FONT_SIZE,
    (input.region.height ?? defaultRegionHeight(input.regionCount)) *
      input.height,
  );
  const base = baseFontSize({
    width: input.width,
    height: input.height,
    scale: input.region.fontScale ?? 1,
  });

  for (let size = base; size >= MIN_FONT_SIZE; size--) {
    const wrapped = wrapText(input.text, input.regionWidth, size);
    const lineHeight = Math.round(size * 1.08);
    const verticalSpan = wrapped.length * lineHeight;
    const rowsFit = wrapped.every(
      (line) => estimatedWidth(line, size) <= input.regionWidth,
    );
    if (rowsFit && verticalSpan <= regionHeight)
      return { lines: wrapped, size, lineHeight };
  }

  const lineHeight = Math.round(MIN_FONT_SIZE * 1.08);
  const maxRows = Math.max(1, Math.floor(regionHeight / lineHeight));
  return {
    lines: clampWithEllipsis(
      wrapText(input.text, input.regionWidth, MIN_FONT_SIZE),
      maxRows,
    ),
    size: MIN_FONT_SIZE,
    lineHeight,
  };
}

export async function renderMemeSvg(
  input: RenderMemeInput,
): Promise<RenderedMeme> {
  const templatePath = await firstExisting(
    [
      path.join(input.pluginDir, input.template.assetPath),
      path.join(input.pluginDir, "public", input.template.assetPath),
    ],
    `Template ${input.template.id}`,
  );
  const fontPath = await firstExisting(
    [
      path.join(input.pluginDir, "assets/fonts/Anton-Regular.ttf"),
      path.join(input.pluginDir, "public/assets/fonts/Anton-Regular.ttf"),
    ],
    "Anton font",
  );

  const width = input.template.width;
  const height = input.template.height;
  const image = await dataUri(templatePath, "image/jpeg");
  const font = await dataUri(fontPath, "font/ttf");
  const lines =
    input.captionCase === "uppercase"
      ? input.lines.map((line) => line.toLocaleUpperCase())
      : input.lines.map((line) => line.trim());
  const regions = textRegions(input.template, lines.length, input.layout);

  const textNodes: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const region = regions[index] ?? regions[regions.length - 1];
    const x = Math.round(region.x * width);
    const y = Math.round(region.y * height);
    const regionWidth = Math.max(64, region.width * width);
    const fit = fitText({
      text: lines[index],
      width,
      height,
      region,
      regionCount: regions.length,
      regionWidth,
    });
    const startY = y - ((fit.lines.length - 1) * fit.lineHeight) / 2;
    for (let row = 0; row < fit.lines.length; row++) {
      textNodes.push(
        `<text x="${x}" y="${Math.round(startY + row * fit.lineHeight)}" text-anchor="middle" dominant-baseline="middle" font-size="${fit.size}" stroke-width="${Math.max(3, Math.round(fit.size / 11))}">${xmlEscape(fit.lines[row])}</text>`,
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xmlEscape(input.template.name)} meme">
<defs>
<style><![CDATA[
@font-face { font-family: "${FONT_FAMILY}"; src: url("${font}") format("truetype"); font-weight: 700; }
.meme-text { font-family: "${FONT_FAMILY}", Impact, sans-serif; font-weight: 700; fill: #fff; stroke: #000; paint-order: stroke fill; stroke-linejoin: round; }
]]></style>
</defs>
<image href="${image}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
<g class="meme-text">${textNodes.join("")}</g>
</svg>`;

  return { svg, width, height };
}
