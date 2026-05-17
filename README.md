# Latanime — Seanime Online Streaming Provider

Seanime extension for [Latanime](https://latanime.org/) (Spanish sub and dub).

## Install

1. Open [Releases](https://github.com/lens7y/seanime-ext-latanime/releases) and download `latanime-online-provider.json` from the latest release.
2. Copy it to your Seanime [data directory](https://seanime.rahim.app/docs/config#data-directory) `extensions` folder.

Older versions are available on the releases page if you need to roll back.

## Development

Edit `latanime.ts`, then rebuild the manifest:

```bash
deno task build:manifest          # refresh payload, keep version
deno task build:manifest:patch    # bump patch version
```

Copy the updated JSON into `extensions` to test locally.

### Layout

- `latanime.ts` — provider source
- `latanime-online-provider.json` — built manifest (`payload` is inlined source)
- `scripts/build-manifest.ts` — build script
- `scripts/release.ts` — publish manifest to GitHub Releases
- `core.d.ts`, `online-streaming-provider.d.ts` — Seanime / provider types

### Test in Playground

Extensions → Playground → Online streaming provider → paste `latanime.ts` (with the `/// <reference` lines).

[Provider API docs](https://seanime.gitbook.io/seanime-extensions/content-providers/online-streaming-provider)

## Releasing

After you bump the version and commit:

```bash
deno task build:manifest:patch   # if not already bumped
deno task release                # gh release create vX.Y.Z with the manifest
```

Use `deno run scripts/release.ts --notes "Your changelog"` for custom release notes.

Requires the [GitHub CLI](https://cli.github.com/) (`gh`) and a pushed repository.

## Servers

**Reliable:** mp4upload, mxdrop (mixdrop alias)

**Also listed:** filemoon, ok, mixdrop, doodstream, yourupload, wolf, mega, uqload, lulu, listeamed, hlswish, voe — availability depends on the episode.

## Behavior

- Site search plus slug fallback when titles do not match
- AniList synonyms for better Spanish title matching
- Dub filter for latino / castellano listings
- Cloudflare challenge pages fail silently (empty result)

## Manifest

| Field | Value |
|-------|--------|
| ID | `latanime-online-provider` |
| Type | `onlinestream-provider` |
| Lang | `es` |

Version is in `latanime-online-provider.json` and matching Git tags (`v0.1.2`, …).
