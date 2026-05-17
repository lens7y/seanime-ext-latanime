#!/usr/bin/env -S deno run --allow-read=./ --allow-write=./
/**
 * Build latanime-online-provider.json from latanime.ts.
 *
 * Usage:
 *   deno task build:manifest
 *   deno task build:manifest:patch
 *   deno run scripts/build-manifest.ts 0.1.2
 */

const root = Deno.cwd();

const SOURCE = `${root}/latanime.ts`;
const MANIFEST = `${root}/latanime-online-provider.json`;

type Manifest = Record<string, unknown> & {
  version: string;
  payload: string;
};

type Args =
  | { mode: "keep" }
  | { mode: "patch" }
  | { mode: "set"; version: string };

function parseArgs(argv: string[]): Args {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage:
  deno task build:manifest
  deno task build:manifest:patch
  deno run scripts/build-manifest.ts [version]

After bumping the version, publish with: deno task release`);
    Deno.exit(0);
  }

  if (argv.includes("--patch")) return { mode: "patch" };

  const version = argv.find((a) => !a.startsWith("-"));
  if (version) return { mode: "set", version };
  return { mode: "keep" };
}

function bumpPatch(version: string): string {
  const parts = version.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid semver: ${version}`);
  }
  parts[2] += 1;
  return parts.join(".");
}

async function readManifest(file: string): Promise<Manifest> {
  return JSON.parse(await Deno.readTextFile(file)) as Manifest;
}

function buildManifest(
  base: Record<string, unknown>,
  payload: string,
  version: string,
): Manifest {
  return { ...base, version, payload } as Manifest;
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args);

  try {
    await Deno.stat(SOURCE);
  } catch {
    console.error(`Source not found: latanime.ts`);
    Deno.exit(1);
  }

  const payload = await Deno.readTextFile(SOURCE);
  let base: Record<string, unknown> = {
    id: "latanime-online-provider",
    name: "Latanime",
    description:
      "Latanime online streaming provider with Subs and Dubs in Spanish.",
    manifestURI: "",
    version: "0.1.0",
    author: "lens7y",
    type: "onlinestream-provider",
    language: "typescript",
    lang: "es",
    icon: "https://latanime.org/favicon.ico",
  };

  let current: Manifest | null = null;
  try {
    current = await readManifest(MANIFEST);
    const { payload: _payload, ...rest } = current;
    base = { ...base, ...rest };
  } catch {
    // no existing manifest
  }

  const currentVersion = current?.version ?? (base.version as string);
  let nextVersion = currentVersion;

  if (args.mode === "patch") {
    nextVersion = bumpPatch(currentVersion);
  } else if (args.mode === "set") {
    nextVersion = args.version;
  }

  const manifest = buildManifest(base, payload, nextVersion);
  await Deno.writeTextFile(
    MANIFEST,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`Wrote latanime-online-provider.json (v${nextVersion})`);
  if (current && nextVersion !== currentVersion) {
    console.log(`Publish with: deno task release`);
  }
}

await main();
