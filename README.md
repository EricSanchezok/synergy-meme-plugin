# synergy-meme-plugin

Synergy plugin for generating meme images from bundled memegen.link templates.

The plugin is fully local at runtime: templates and the Anton font are packaged into the plugin artifact, and generated results are uploaded to Synergy's asset store as `image/svg+xml` attachments.

Template metadata and blank images are snapshotted from the public [memegen.link templates API](https://api.memegen.link/templates/). The renderer uses bundled local template images and the bundled Anton font at runtime, so generation does not need network access.

The plugin also injects a short system prompt for the primary `synergy` and `synergy-max` agents, teaching them to use memes as a lightweight emotional expression channel when it fits the conversation.

## Development

```bash
bun install
bun run sync:templates
bun run release:check
```

Useful commands:

```bash
bun run validate:plugin
bun run build:plugin
bun run pack:plugin
bun run sign:plugin synergy-meme-plugin-0.3.7.synergy-plugin.tgz

# Inspect template ranking while tuning search semantics.
bun run search:templates -- "程序员 debug 半天发现少了分号" --lines 2 --limit 10
bun run search:templates -- "old way vs new way" --lines 2 --json
bun run eval:search               # run fixture evaluation and see coverage stats
```

## Tools

- `generate_meme`: accepts an emotional brief with the situation, feeling, contrast, and optional caption idea; optionally accepts `template` and `lines`; chooses a bundled template when needed; renders a local SVG meme; and attaches it as the primary visual result.

`generate_meme` declares Synergy's media-generation display protocol with a hidden tool card, a compact pending placeholder, and a medium generated SVG image attachment. Recent Synergy clients show the unified image-generation placeholder while the tool runs, then promote the generated meme into the final turn response instead of showing a tool card.

## Publishing

```bash
bun run publish:market
```

This runs the Synergy Plugin Kit official marketplace flow for `https://github.com/EricSanchezok/synergy-meme-plugin`.

For manual registry preparation:

```bash
synergy-plugin entry synergy-meme-plugin-0.3.7.synergy-plugin.tgz \
  --repo https://github.com/EricSanchezok/synergy-meme-plugin \
  --download-url https://github.com/EricSanchezok/synergy-meme-plugin/releases/download/v0.3.7/synergy-meme-plugin-0.3.7.synergy-plugin.tgz \
  --signature-url https://github.com/EricSanchezok/synergy-meme-plugin/releases/download/v0.3.7/synergy-meme-plugin-0.3.7.synergy-plugin.tgz.sig
```
