# Latanime — Seanime Online Streaming Provider

Online streaming provider for [Latanime](https://latanime.org/) (Spanish sub/dub).

## Install

`https://github.com/lens7y/seanime-ext-latanime/releases/latest/download/manifest.json`

Seanime → Extensions → add from URL. Older versions: [Releases](https://github.com/lens7y/seanime-ext-latanime/releases).

## Development

Edit `src/provider.ts`. [Provider API](https://seanime.gitbook.io/seanime-extensions/content-providers/online-streaming-provider).

```bash
deno task dev
```

Seanime → Extensions → add from URL (install link printed by the task).

Playground: paste `src/provider.ts` to test methods.

## Release

`deno task release` updates `manifest.json` (version bump when source changed), commits, tags, then prints a push command.

```bash
deno task release -- "message"
deno task release:push -- "message"
```

CI publishes release assets on tag push.

## Servers

mp4upload, mxdrop, filemoon, ok, mixdrop, doodstream, yourupload, wolf, mega, uqload, lulu, listeamed, hlswish, voe — availability varies by episode.
