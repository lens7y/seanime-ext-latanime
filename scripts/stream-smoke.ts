/// <reference path="../src/core.d.ts" />
/// <reference path="../src/online-streaming-provider.d.ts" />

// @ts-ignore: CryptoJS is injected by Seanime at runtime
globalThis.CryptoJS = {
  enc: {
    Utf8: { stringify: () => "" },
    Base64: { parse: () => new Uint8Array() },
  },
} as CryptoJS;

type ProviderCtor = new () => AnimeProvider;

async function loadProvider(): Promise<ProviderCtor> {
  const providerUrl = new URL("../src/provider.ts", import.meta.url);
  let code = await Deno.readTextFile(providerUrl);
  code = code
    .replace(
      '/// <reference path="./core.d.ts" />',
      '/// <reference path="../src/core.d.ts" />',
    )
    .replace(
      '/// <reference path="./online-streaming-provider.d.ts" />',
      '/// <reference path="../src/online-streaming-provider.d.ts" />',
    )
    .trimEnd() +
    "\n\n(globalThis as Record<string, unknown>).Provider = Provider;\n";

  const entryUrl = new URL("../.test-artifacts/stream-smoke-entry.ts", import.meta.url);
  await Deno.mkdir(new URL("../.test-artifacts/", import.meta.url), { recursive: true });
  await Deno.writeTextFile(entryUrl, code);
  await import(entryUrl.href);

  const ctor = (globalThis as { Provider?: ProviderCtor }).Provider;
  if (!ctor) throw new Error("Provider not registered after loading test entry");
  return ctor;
}

type StreamCase = {
  label: string;
  episode: EpisodeDetails;
  server: string;
  expectEmpty?: boolean;
};

function ep(
  id: string,
  url: string,
  title = "Ep 1",
  number = 1,
): EpisodeDetails {
  return { id, url, title, number };
}

const EPISODES = {
  witchHat: ep(
    "ver/atelier-of-witch-hat-castellano-episodio-1",
    "https://latanime.org/ver/atelier-of-witch-hat-castellano-episodio-1",
  ),
  fma: ep(
    "ver/fullmetal-alchemist-brotherhood-latino-episodio-1",
    "https://latanime.org/ver/fullmetal-alchemist-brotherhood-latino-episodio-1",
  ),
  onePiece: ep(
    "ver/one-piece-latino-episodio-1",
    "https://latanime.org/ver/one-piece-latino-episodio-1",
  ),
  naruto: ep(
    "ver/naruto-latino-episodio-1",
    "https://latanime.org/ver/naruto-latino-episodio-1",
  ),
  nineZeroNineOne: ep(
    "ver/009-1-episodio-1",
    "https://latanime.org/ver/009-1-episodio-1",
  ),
};

const CASES: StreamCase[] = [
  // witch hat — mp4upload / mixdrop / voe regression
  { label: "witch-hat:mp4upload", server: "mp4upload", episode: EPISODES.witchHat },
  { label: "witch-hat:default", server: "default", episode: EPISODES.witchHat },
  { label: "witch-hat:mixdrop", server: "mixdrop", episode: EPISODES.witchHat },
  { label: "witch-hat:voe", server: "voe", episode: EPISODES.witchHat },

  // fma — uqload packer regression
  { label: "fma:uqload", server: "uqload", episode: EPISODES.fma },
  { label: "fma:default", server: "default", episode: EPISODES.fma },
  {
    label: "fma:mp4upload-missing",
    server: "mp4upload",
    expectEmpty: true,
    episode: EPISODES.fma,
  },

  // one piece — filemoon (often first on page), lulu, mxdrop
  { label: "one-piece:filemoon", server: "filemoon", episode: EPISODES.onePiece },
  { label: "one-piece:uqload", server: "uqload", episode: EPISODES.onePiece },
  { label: "one-piece:lulu", server: "lulu", episode: EPISODES.onePiece },
  { label: "one-piece:mxdrop", server: "mxdrop", episode: EPISODES.onePiece },
  { label: "one-piece:voe", server: "voe", episode: EPISODES.onePiece },
  {
    label: "one-piece:no-dood",
    server: "doodstream",
    expectEmpty: true,
    episode: EPISODES.onePiece,
  },

  // naruto — dood + filemoon
  { label: "naruto:doodstream", server: "doodstream", episode: EPISODES.naruto },
  { label: "naruto:d-s-alias", server: "d-s", episode: EPISODES.naruto },
  { label: "naruto:filemoon", server: "filemoon", episode: EPISODES.naruto },

  // ok.ru — on ~83% of catalog pages
  { label: "009-1:ok", server: "ok", episode: EPISODES.nineZeroNineOne },

  // dead hosts — expect empty
  {
    label: "witch-hat:hexload-dead",
    server: "hexload",
    expectEmpty: true,
    episode: EPISODES.witchHat,
  },
];

const ProviderCtor = await loadProvider();
const provider = new ProviderCtor();
const t0 = performance.now();
let failed = 0;

console.log("Stream smoke (live Latanime)\n");

for (const c of CASES) {
  const start = performance.now();
  const result = await provider.findEpisodeServer(c.episode, c.server);
  const src = result.videoSources[0];
  const ms = Math.round(performance.now() - start);
  const ok = c.expectEmpty ? !src : !!src && (src.type === "mp4" || src.type === "m3u8");

  if (!ok) failed++;

  const detail = src
    ? `${result.server} ${src.type} ${src.url.slice(0, 72)}…`
    : "empty (no extractable source)";
  console.log(`${ok ? "OK" : "FAIL"} [${c.label}] ${detail} (${ms}ms)`);
}

console.log(`\n${CASES.length - failed}/${CASES.length} passed in ${Math.round(performance.now() - t0)}ms`);
if (failed > 0) Deno.exit(1);
