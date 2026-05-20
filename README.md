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
deno task test:smoke      # search (live)
deno task test:stream     # playback resolvers (live)
```

`scripts/smoke.ts` — search regression. `scripts/stream-smoke.ts` — mp4upload, mixdrop, uqload, voe, filemoon, dood, ok.ru, etc. Search smoke runs in CI and `deno task release` before tagging.

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

Seanime lists these when the episode page has a matching button:

| Server | Notes |
|--------|--------|
| mp4upload | Primary; direct mp4 |
| mxdrop / mixdrop | Aliases; mxcontent mp4 |
| uqload | HLS; packer unpack |
| voe | mp4 via embed JSON |
| lulu / lulustream | HLS |
| filemoon | HLS; encrypted API |
| doodstream / d-s | mp4; aliases |
| ok | HLS or mp4 from embed metadata |

Other hosts sometimes appear on Latanime (videobin, mega, listeamed, embedv, …) but are **not** offered in settings until a resolver exists. Default playback tries the servers above in that order.

Per-episode availability varies on Latanime.
