# synergy-meme-plugin

Synergy plugin for generating meme images from bundled memegen.link templates.

The plugin is fully local at runtime: templates and the Anton font are packaged into the plugin artifact, and generated results are uploaded to Synergy's asset store as `image/svg+xml` attachments.

Template metadata and blank images are snapshotted from the public [memegen.link templates API](https://api.memegen.link/templates/). The renderer uses bundled local template images and the bundled Anton font at runtime, so generation does not need network access.

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
bun run sign:plugin synergy-meme-plugin-0.1.0.synergy-plugin.tgz
```

## Tools

- `search_meme_templates`: find template ids by name, keyword, style, or line count.
- `generate_meme`: render a local SVG meme and attach it as the primary visual result.

`generate_meme` sets `metadata.display.presentation = "artifact-only"`, so recent Synergy clients promote the image into the final turn response instead of showing a tool card.

## Publishing

```bash
bun run publish:market
```

This runs the Synergy Plugin Kit official marketplace flow for `https://github.com/EricSanchezok/synergy-meme-plugin`.

For manual registry preparation:

```bash
synergy-plugin entry synergy-meme-plugin-0.1.0.synergy-plugin.tgz \
  --repo https://github.com/EricSanchezok/synergy-meme-plugin \
  --download-url https://github.com/EricSanchezok/synergy-meme-plugin/releases/download/v0.1.0/synergy-meme-plugin-0.1.0.synergy-plugin.tgz \
  --signature-url https://github.com/EricSanchezok/synergy-meme-plugin/releases/download/v0.1.0/synergy-meme-plugin-0.1.0.synergy-plugin.tgz.sig
```
