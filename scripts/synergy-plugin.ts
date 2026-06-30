import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dir, "..")

function cliFrom(value: string | undefined) {
  if (!value) return undefined
  const resolved = path.resolve(root, value)
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved

  const nested = path.join(resolved, "src", "cli.ts")
  if (fs.existsSync(nested)) return nested
  return undefined
}

const cli =
  cliFrom(process.env.SYNERGY_PLUGIN_KIT) ?? cliFrom("../synergy/packages/plugin-kit/src/cli.ts")

if (!cli) {
  console.error(
    [
      "Unable to find the current Synergy plugin-kit CLI.",
      "Set SYNERGY_PLUGIN_KIT to packages/plugin-kit/src/cli.ts or keep the synergy repo next to this plugin repo.",
    ].join("\n"),
  )
  process.exit(1)
}

const proc = Bun.spawn(["bun", cli, ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

process.exit(await proc.exited)
