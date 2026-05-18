const SOURCE = "src/provider.ts";
const MANIFEST = "manifest.json";
const DEV_DIR = ".dev";
const DEV_MANIFEST = `${DEV_DIR}/manifest.dev.json`;
const DEV_ID = "latanime-online-provider-dev";

const port = Deno.env.get("DEV_PORT") ?? "8787";
const host = Deno.env.get("DEV_HOST") ?? "127.0.0.1";
const baseUrl = `http://${host}:${port}`;
export const installUrl = `${baseUrl}/${DEV_MANIFEST}`;

async function readDevVersion(): Promise<string> {
  try {
    const m = JSON.parse(await Deno.readTextFile(DEV_MANIFEST)) as {
      version?: string;
    };
    if (m.version && /^\d+\.\d+\.\d+$/.test(m.version)) return m.version;
  } catch {
    // first run
  }
  return "0.0.0";
}

async function loadBaseManifest(): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await Deno.readTextFile(MANIFEST)) as Record<string, unknown>;
  } catch {
    return {
      id: "latanime-online-provider",
      name: "Latanime",
      description: "Latanime online streaming provider for Seanime",
      version: "0.0.0",
      author: "lens7y",
      type: "onlinestream-provider",
      language: "typescript",
      lang: "es",
      icon:
        "https://raw.githubusercontent.com/lens7y/seanime-ext-latanime/main/public/icon.png",
    };
  }
}

async function buildDevManifest(): Promise<Record<string, unknown>> {
  const base = await loadBaseManifest();
  const dev: Record<string, unknown> = {
    ...base,
    id: DEV_ID,
    name: "Latanime (dev)",
    description: "Local development build",
    version: await readDevVersion(),
    manifestURI: installUrl,
    payloadURI: `${baseUrl}/${SOURCE}`,
  };
  delete dev.sourceHash;
  delete dev.payload;
  return dev;
}

if (import.meta.main) {
  await Deno.mkdir(DEV_DIR, { recursive: true });
  const dev = await buildDevManifest();
  await Deno.writeTextFile(DEV_MANIFEST, JSON.stringify(dev, null, 2) + "\n");
  console.log(`Wrote ${DEV_MANIFEST} (v${dev.version})`);
  console.log(installUrl);
}
