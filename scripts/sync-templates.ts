import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dir, "..")
const templatesDir = path.join(root, "public/assets/templates")
const fontsDir = path.join(root, "public/assets/fonts")
const generatedPath = path.join(root, "src/data/templates.generated.ts")
const apiUrl = "https://api.memegen.link/templates/"
const antonFontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf"
const antonLicenseUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/OFL.txt"

interface ApiTemplate {
  id: string
  name: string
  lines: number
  overlays?: number
  styles?: string[]
  blank: string
  source?: string
  keywords?: string[]
}

function sha256(bytes: Buffer) {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
}

function imageDimensions(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset < bytes.length) {
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === 0xd9 || marker === 0xda) break
      const length = bytes.readUInt16BE(offset)
      const sof =
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf
      if (sof) {
        return {
          height: bytes.readUInt16BE(offset + 3),
          width: bytes.readUInt16BE(offset + 5),
        }
      }
      offset += length
    }
  }

  throw new Error("Unsupported image format")
}

async function download(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Failed to download ${url}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function downloadWithRetry(url: string, attempts = 3) {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await download(url)
    } catch (error) {
      lastError = error
      if (attempt < attempts) await Bun.sleep(250 * attempt)
    }
  }
  throw lastError
}

async function writeFileIfChanged(filepath: string, bytes: Buffer | string) {
  const next = typeof bytes === "string" ? Buffer.from(bytes) : bytes
  if (fs.existsSync(filepath)) {
    const current = fs.readFileSync(filepath)
    if (current.equals(next)) return false
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, next)
  return true
}

async function syncFont() {
  fs.mkdirSync(fontsDir, { recursive: true })
  await writeFileIfChanged(path.join(fontsDir, "Anton-Regular.ttf"), await downloadWithRetry(antonFontUrl))
  await writeFileIfChanged(path.join(fontsDir, "OFL.txt"), await downloadWithRetry(antonLicenseUrl))
}

function generatedSource(entries: unknown[]) {
  return `import type { MemeTemplate } from "./types"

export const templates: MemeTemplate[] = ${JSON.stringify(entries, null, 2)}

export const templateById: Record<string, MemeTemplate> = Object.fromEntries(
  templates.map((template) => [template.id, template]),
)
`
}

async function main() {
  console.log("Fetching memegen template index...")
  const apiList = (await (await fetch(apiUrl, { signal: AbortSignal.timeout(30000) })).json()) as ApiTemplate[]
  if (!Array.isArray(apiList) || apiList.length === 0) throw new Error("memegen template API returned no templates")

  const byId = new Map<string, ApiTemplate>()
  let duplicates = 0
  for (const item of apiList) {
    const id = item.id.trim()
    const existing = byId.get(id)
    if (!existing) {
      byId.set(id, { ...item, id })
      continue
    }
    duplicates++
    byId.set(id, {
      ...existing,
      ...item,
      id,
      styles: [...new Set([...(existing.styles ?? []), ...(item.styles ?? [])])],
      keywords: [...new Set([...(existing.keywords ?? []), ...(item.keywords ?? [])])],
      source: existing.source ?? item.source,
    })
  }
  const list = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
  if (duplicates > 0) console.warn(`Merged ${duplicates} duplicate template id(s) from the memegen API.`)

  await syncFont()

  const entries = []
  let changed = 0
  for (const [index, item] of list.entries()) {
    const id = item.id.trim()
    const rel = `assets/templates/${id}/template.jpg`
    const filepath = path.join(root, "public", rel)
    const bytes = await downloadWithRetry(item.blank)
    const dimensions = imageDimensions(bytes)
    if (await writeFileIfChanged(filepath, bytes)) changed++

    entries.push({
      id,
      name: item.name,
      lines: item.lines,
      overlays: item.overlays ?? 0,
      styles: item.styles ?? [],
      blank: item.blank,
      ...(item.source ? { source: item.source } : {}),
      keywords: item.keywords ?? [],
      width: dimensions.width,
      height: dimensions.height,
      assetPath: rel,
      sha256: sha256(bytes),
    })

    if ((index + 1) % 25 === 0 || index === list.length - 1) {
      console.log(`  ${index + 1}/${list.length} templates synced`)
    }
  }

  entries.sort((a, b) => a.id.localeCompare(b.id))
  await writeFileIfChanged(generatedPath, generatedSource(entries))
  console.log(`Synced ${entries.length} templates (${changed} image files changed).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
