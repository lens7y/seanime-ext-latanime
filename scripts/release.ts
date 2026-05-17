#!/usr/bin/env -S deno run --allow-read=./ --allow-run=gh
/**
 * Create a GitHub release for the current manifest version.
 *
 * Usage:
 *   deno task release
 *   deno run scripts/release.ts --notes "Fix search"
 */

const MANIFEST = `${Deno.cwd()}/latanime-online-provider.json`;
const ASSET_NAME = "latanime-online-provider.json";

type Manifest = { version: string; name?: string };

async function main(): Promise<void> {
  const manifest = JSON.parse(
    await Deno.readTextFile(MANIFEST),
  ) as Manifest;
  const version = manifest.version;
  const tag = `v${version}`;

  const notesIdx = Deno.args.indexOf("--notes");
  const notes =
    notesIdx >= 0 ? Deno.args[notesIdx + 1] : `Release ${tag}`;

  const title = manifest.name
    ? `${manifest.name} ${tag}`
    : tag;

  const cmd = new Deno.Command("gh", {
    args: [
      "release",
      "create",
      tag,
      MANIFEST,
      "--title",
      title,
      "--notes",
      notes,
    ],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await cmd.output();
  if (code !== 0) {
    console.error(`gh release create failed (exit ${code})`);
    Deno.exit(code);
  }

  console.log(`Created ${tag} with asset ${ASSET_NAME}`);
}

await main();
