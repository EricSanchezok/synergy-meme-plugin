import type { MemeTemplate } from "../data/types"

export interface TextRegion {
  x: number
  y: number
  width: number
  fontScale?: number
}

const overrides: Record<string, TextRegion[]> = {
  drake: [
    { x: 0.75, y: 0.25, width: 0.42, fontScale: 0.95 },
    { x: 0.75, y: 0.75, width: 0.42, fontScale: 0.95 },
  ],
  db: [
    { x: 0.28, y: 0.12, width: 0.28, fontScale: 0.8 },
    { x: 0.7, y: 0.12, width: 0.3, fontScale: 0.8 },
  ],
  gb: [
    { x: 0.28, y: 0.12, width: 0.44, fontScale: 0.72 },
    { x: 0.28, y: 0.29, width: 0.44, fontScale: 0.72 },
    { x: 0.28, y: 0.46, width: 0.44, fontScale: 0.72 },
    { x: 0.28, y: 0.63, width: 0.44, fontScale: 0.72 },
    { x: 0.28, y: 0.8, width: 0.44, fontScale: 0.72 },
    { x: 0.28, y: 0.93, width: 0.44, fontScale: 0.66 },
  ],
  astronaut: [
    { x: 0.3, y: 0.15, width: 0.44, fontScale: 0.78 },
    { x: 0.72, y: 0.58, width: 0.36, fontScale: 0.78 },
    { x: 0.26, y: 0.88, width: 0.32, fontScale: 0.66 },
    { x: 0.74, y: 0.88, width: 0.32, fontScale: 0.66 },
  ],
}

export function textRegions(template: MemeTemplate, lineCount: number, layout: "default" | "top" | "center") {
  if (layout === "default" && overrides[template.id]?.length >= lineCount) {
    return overrides[template.id].slice(0, lineCount)
  }

  if (layout === "top") {
    return Array.from({ length: lineCount }, (_, index) => ({
      x: 0.5,
      y: 0.12 + index * 0.12,
      width: 0.86,
      fontScale: 0.9,
    }))
  }

  if (layout === "center") {
    const start = 0.5 - (lineCount - 1) * 0.07
    return Array.from({ length: lineCount }, (_, index) => ({
      x: 0.5,
      y: start + index * 0.14,
      width: 0.86,
      fontScale: 0.9,
    }))
  }

  if (lineCount <= 1) return [{ x: 0.5, y: 0.12, width: 0.86, fontScale: 1 }]
  if (lineCount === 2) {
    return [
      { x: 0.5, y: 0.12, width: 0.86, fontScale: 1 },
      { x: 0.5, y: 0.9, width: 0.86, fontScale: 1 },
    ]
  }

  const top = 0.12
  const bottom = 0.9
  return Array.from({ length: lineCount }, (_, index) => ({
    x: 0.5,
    y: top + ((bottom - top) * index) / (lineCount - 1),
    width: 0.86,
    fontScale: 0.88,
  }))
}
