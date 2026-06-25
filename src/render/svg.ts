import path from "node:path"
import type { MemeTemplate } from "../data/types"
import { textRegions } from "./layout-overrides"

export interface RenderMemeInput {
  pluginDir: string
  template: MemeTemplate
  lines: string[]
  layout: "default" | "top" | "center"
  captionCase: "uppercase" | "preserve"
}

export interface RenderedMeme {
  svg: string
  width: number
  height: number
}

const FONT_FAMILY = "SynergyMemeAnton"

async function firstExisting(paths: string[], label: string) {
  for (const candidate of paths) {
    if (await Bun.file(candidate).exists()) return candidate
  }
  throw new Error(`${label} not found. Run "bun run sync:templates" and rebuild the plugin.`)
}

async function dataUri(filepath: string, mime: string) {
  const bytes = Buffer.from(await Bun.file(filepath).arrayBuffer())
  return `data:${mime};base64,${bytes.toString("base64")}`
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function charWeight(char: string) {
  if (/\s/u.test(char)) return 0.34
  if (/[\u2E80-\u9FFF\uAC00-\uD7AF]/u.test(char)) return 1
  if (char.codePointAt(0)! > 0xffff) return 1
  if (/[il.,'`|!]/u.test(char)) return 0.28
  if (/[mwMW@#%&]/u.test(char)) return 0.86
  return 0.62
}

function weightedLength(value: string) {
  return [...value].reduce((sum, char) => sum + charWeight(char), 0)
}

function splitLongToken(token: string, limit: number) {
  const chunks: string[] = []
  let current = ""
  let weight = 0
  for (const char of [...token]) {
    const nextWeight = charWeight(char)
    if (current && weight + nextWeight > limit) {
      chunks.push(current)
      current = char
      weight = nextWeight
    } else {
      current += char
      weight += nextWeight
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function wrapText(value: string, maxWeightedLength: number) {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean)
  if (words.length === 0) return [""]

  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidates = weightedLength(word) > maxWeightedLength ? splitLongToken(word, maxWeightedLength) : [word]
    for (const candidate of candidates) {
      const next = current ? `${current} ${candidate}` : candidate
      if (current && weightedLength(next) > maxWeightedLength) {
        lines.push(current)
        current = candidate
      } else {
        current = next
      }
    }
  }
  if (current) lines.push(current)
  return lines
}

function fontSizeFor(input: { width: number; height: number; regionWidth: number; text: string; scale: number }) {
  const base = Math.max(24, Math.round(Math.min(input.width, input.height) * 0.078 * input.scale))
  const weighted = Math.max(1, weightedLength(input.text))
  const fit = Math.floor(input.regionWidth / (weighted * 0.62))
  return Math.max(18, Math.min(base, fit || base))
}

export async function renderMemeSvg(input: RenderMemeInput): Promise<RenderedMeme> {
  const templatePath = await firstExisting(
    [
      path.join(input.pluginDir, input.template.assetPath),
      path.join(input.pluginDir, "public", input.template.assetPath),
    ],
    `Template ${input.template.id}`,
  )
  const fontPath = await firstExisting(
    [
      path.join(input.pluginDir, "assets/fonts/Anton-Regular.ttf"),
      path.join(input.pluginDir, "public/assets/fonts/Anton-Regular.ttf"),
    ],
    "Anton font",
  )

  const width = input.template.width
  const height = input.template.height
  const image = await dataUri(templatePath, "image/jpeg")
  const font = await dataUri(fontPath, "font/ttf")
  const lines =
    input.captionCase === "uppercase"
      ? input.lines.map((line) => line.toLocaleUpperCase())
      : input.lines.map((line) => line.trim())
  const regions = textRegions(input.template, lines.length, input.layout)

  const textNodes: string[] = []
  for (let index = 0; index < lines.length; index++) {
    const region = regions[index] ?? regions[regions.length - 1]
    const x = Math.round(region.x * width)
    const y = Math.round(region.y * height)
    const regionWidth = Math.max(64, region.width * width)
    const size = fontSizeFor({
      width,
      height,
      regionWidth,
      text: lines[index],
      scale: region.fontScale ?? 1,
    })
    const wrapped = wrapText(lines[index], Math.max(6, regionWidth / (size * 0.62)))
    const lineHeight = Math.round(size * 1.08)
    const startY = y - ((wrapped.length - 1) * lineHeight) / 2
    for (let row = 0; row < wrapped.length; row++) {
      textNodes.push(
        `<text x="${x}" y="${Math.round(startY + row * lineHeight)}" text-anchor="middle" dominant-baseline="middle" font-size="${size}" stroke-width="${Math.max(3, Math.round(size / 11))}">${xmlEscape(wrapped[row])}</text>`,
      )
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
</svg>`

  return { svg, width, height }
}
