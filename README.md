# Latanime — Seanime Online Streaming Provider

Seanime extension that streams from [Latanime](https://latanime.org/). Dub preference: Latino, then Castellano; Japanese/sub when no dub is listed.

## Install

Manifest URL:

`https://github.com/lens7y/seanime-ext-latanime/releases/latest/download/manifest.json`

In Seanime: **Extensions → Add from URL**. Previous builds: [Releases](https://github.com/lens7y/seanime-ext-latanime/releases).

## Development

Source: `src/provider.ts`. API reference: [Online streaming provider](https://seanime.gitbook.io/seanime-extensions/content-providers/online-streaming-provider).

```bash
deno task dev
```

Serves a dev manifest; use the printed URL in Seanime. Individual methods can be exercised in the Seanime playground with a copy of `src/provider.ts`.

## Testing

```bash
deno check src/provider.ts
deno task test:smoke
```

`scripts/smoke.ts` — live search checks against Latanime (network required). Same steps run in CI on `main` and in `deno task release` before tagging.

## Release

```bash
deno task release -- "message"
deno task release:push -- "message"
```

1. Bump `manifest.json` when provider sources changed  
2. Commit release files  
3. `deno check` + smoke  
4. Annotated tag `v{version}`  

Push the tag to trigger [.github/workflows/release.yml](.github/workflows/release.yml) (manifest build + GitHub Release assets).

## Episode servers

mp4upload, mxdrop, filemoon, ok, mixdrop, doodstream, yourupload, wolf, mega, uqload, lulu, listeamed, hlswish, voe

Per-episode availability varies on Latanime.
