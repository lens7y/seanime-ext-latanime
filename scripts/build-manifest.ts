const root = Deno.cwd();
const SOURCE = `${root}/src/provider.ts`;
const MANIFEST = `${root}/manifest.json`;

const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "lens7y/seanime-ext-latanime";
const GITHUB_REF = Deno.env.get("GITHUB_REF") ?? "";

const MANIFEST_BASENAME = "manifest.json";
const SOURCE_PATH = "src/provider.ts";
const ICON_PATH = "public/icon.png";

function defaultIconUrl(): string {
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${ICON_PATH}`;
}

type Manifest = {
  id: string;
  name: string;
  description: string;
  manifestURI: string;
  version: string;
  author: string;
  type: string;
  language: string;
  lang: string;
  icon: string;
  payloadURI: string;
  sourceHash?: string;
};

function rawUrl(ref: string, file: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/${ref}/${file}`;
}

function releasePayloadUri(ref: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/${ref}/provider.ts`;
}

function latestManifestUri(): string {
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/${MANIFEST_BASENAME}`;
}

function bumpPatch(version: string): string {
  const parts = version.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid semver: ${version}`);
  }
  parts[2] += 1;
  return parts.join(".");
}

async function hashFile(path: string): Promise<string> {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isReleaseRef(ref: string): boolean {
  return ref.length > 0 && !ref.includes("heads/");
}

function defaultManifest(
  version: string,
  sourceHash: string,
  uris?: { manifestURI: string; payloadURI: string },
): Manifest {
  return {
    id: "latanime-online-provider",
    name: "Latanime",
    description:
      "Latanime online streaming provider with Subs and Dubs in Spanish.",
    manifestURI: uris?.manifestURI ?? "",
    version,
    author: "lens7y",
    type: "onlinestream-provider",
    language: "typescript",
    lang: "es",
    icon: defaultIconUrl(),
    payloadURI: uris?.payloadURI ?? "",
    sourceHash,
  };
}

export async function buildManifest(): Promise<void> {
  if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
    console.log("Usage: deno task build:manifest\nEnv: GITHUB_REPO, GITHUB_REF (tag)");
    Deno.exit(0);
  }

  try {
    await Deno.stat(SOURCE);
  } catch {
    console.error(`Source not found: ${SOURCE_PATH}`);
    Deno.exit(1);
  }

  const sourceHash = await hashFile(SOURCE);

  let manifest: Manifest;
  try {
    manifest = JSON.parse(await Deno.readTextFile(MANIFEST)) as Manifest;
  } catch {
    manifest = defaultManifest("0.1.0", sourceHash);
  }

  const hashChanged = manifest.sourceHash !== sourceHash;
  let version = manifest.version ?? "0.1.0";

  if (hashChanged) {
    if (manifest.sourceHash) {
      version = bumpPatch(version);
      console.log(`v${version}`);
    }
  }

  const release = isReleaseRef(GITHUB_REF);
  const uris = release
    ? {
        manifestURI: latestManifestUri(),
        payloadURI: releasePayloadUri(GITHUB_REF),
      }
    : {
        manifestURI: manifest.manifestURI ?? "",
        payloadURI: manifest.payloadURI ?? "",
      };

  const next: Manifest = {
    ...defaultManifest(version, sourceHash, uris),
    ...manifest,
    version,
    sourceHash,
    ...uris,
  };

  delete (next as Record<string, unknown>).payload;
  if (release) delete next.sourceHash;

  await Deno.writeTextFile(MANIFEST, JSON.stringify(next, null, 2) + "\n");
}

if (import.meta.main) {
  await buildManifest();
}
