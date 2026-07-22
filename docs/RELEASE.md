# Release

Canonical plugin id: `synergy-meme-plugin`

Official source repository:

```text
https://github.com/EricSanchezok/synergy-meme-plugin
```

## Checklist

```bash
bun install
bun run sync:templates
bun run release:check
bun run sign:plugin synergy-meme-plugin-0.3.8.synergy-plugin.tgz
bun run publish:market
```

`publish:market` uses `synergy-plugin publish-market --repo https://github.com/EricSanchezok/synergy-meme-plugin`. It validates the API3 `definePlugin()` descriptor, builds and packs the generated artifact, signs and uploads GitHub Release assets when `gh` is authenticated, writes the official registry entry, regenerates `registry.json`, and opens a PR against `SII-Holos/synergy-plugins`.

If automatic publishing cannot complete, use the printed fallback commands or generate the entry manually:

```bash
synergy-plugin entry synergy-meme-plugin-0.3.8.synergy-plugin.tgz \
  --repo https://github.com/EricSanchezok/synergy-meme-plugin \
  --write-entry ../synergy-plugins/plugins/synergy-meme-plugin.json
```
