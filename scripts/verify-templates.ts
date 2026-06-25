import fs from "node:fs"
import path from "node:path"
import { templates } from "../src/data/templates.generated"

const root = path.resolve(import.meta.dir, "..")

function sha256(filepath: string) {
  return new Bun.CryptoHasher("sha256").update(fs.readFileSync(filepath)).digest("hex")
}

const errors: string[] = []

if (templates.length === 0) errors.push("No templates generated. Run bun run sync:templates.")

for (const template of templates) {
  const filepath = path.join(root, "public", template.assetPath)
  if (!fs.existsSync(filepath)) {
    errors.push(`${template.id}: missing ${template.assetPath}`)
    continue
  }
  const hash = sha256(filepath)
  if (hash !== template.sha256) errors.push(`${template.id}: sha256 mismatch ${hash} != ${template.sha256}`)
  if (!Number.isFinite(template.width) || template.width <= 0) errors.push(`${template.id}: invalid width`)
  if (!Number.isFinite(template.height) || template.height <= 0) errors.push(`${template.id}: invalid height`)
}

for (const required of ["public/assets/fonts/Anton-Regular.ttf", "public/assets/fonts/OFL.txt"]) {
  if (!fs.existsSync(path.join(root, required))) errors.push(`Missing ${required}`)
}

if (errors.length > 0) {
  console.error(errors.join("\n"))
  process.exit(1)
}

console.log(`Verified ${templates.length} templates and bundled font assets.`)
