/// <reference path="../src/core.d.ts" />
/// <reference path="../src/online-streaming-provider.d.ts" />

// @ts-ignore: CryptoJS global is provided by Seanime at runtime
globalThis.CryptoJS = {
  enc: {
    Utf8: { stringify: () => "" },
    Base64: { parse: () => ({}) },
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

  const entryUrl = new URL("../.test-artifacts/provider-entry.ts", import.meta.url);
  await Deno.mkdir(new URL("../.test-artifacts/", import.meta.url), {
    recursive: true,
  });
  await Deno.writeTextFile(entryUrl, code);
  await import(entryUrl.href);

  const ctor = (globalThis as { Provider?: ProviderCtor }).Provider;
  if (!ctor) throw new Error("Provider not registered after loading test entry");
  return ctor;
}

export const Provider: ProviderCtor = await loadProvider();

type SmokeCase = {
  label: string;
  id: number;
  english: string;
  romaji: string;
  synonyms?: string[];
  expectIdIncludes?: string;
  expectIdExcludes?: string;
  expectMiss?: boolean;
};

const CASES: SmokeCase[] = [
  {
    label: "regression:season-s2",
    id: 20958,
    english: "Attack on Titan Season 2",
    romaji: "Shingeki no Kyojin Season 2",
    synonyms: ["SnK 2"],
    expectIdIncludes: "s2",
  },
  {
    label: "regression:mha-s2",
    id: 21856,
    english: "My Hero Academia Season 2",
    romaji: "Boku no Hero Academia 2",
    synonyms: ["MHA 2"],
  },
  {
    label: "risk:true-alias",
    id: 21234,
    english: "ERASED",
    romaji: "Boku dake ga Inai Machi",
    expectMiss: true,
  },
  {
    label: "title:dash",
    id: 20623,
    english: "Parasyte -the maxim-",
    romaji: "Kiseijuu: Sei no Kakuritsu",
  },
  {
    label: "season:ordinal",
    id: 20992,
    english: "HAIKYU!! 2nd Season",
    romaji: "Haikyuu!! 2nd Season",
  },
  {
    label: "season:part",
    id: 104578,
    english: "Attack on Titan Season 3 Part 2",
    romaji: "Shingeki no Kyojin Season 3 Part 2",
  },
  {
    label: "season:temporada-N",
    id: 182300,
    english: "Wistoria: Wand and Sword Season 2",
    romaji: "Tsue to Tsurugi no Wistoria Season 2",
    expectIdIncludes: "varita-y-espada",
  },
  {
    label: "audio:prefer-latino",
    id: 101302,
    english: "Dragon Ball Super: Broly",
    romaji: "Dragon Ball Super: Broly",
    expectIdIncludes: "latino",
    expectIdExcludes: "castellano",
  },
  {
    label: "shape:plain-single",
    id: 98472,
    english: "Africa no Salaryman",
    romaji: "Africa no Salaryman",
    expectIdIncludes: "africa-no-salaryman",
  },
  {
    label: "audio:latino",
    id: 101922,
    english: "Demon Slayer: Kimetsu no Yaiba",
    romaji: "Kimetsu no Yaiba",
    expectIdIncludes: "latino",
  },
  {
    label: "audio:castellano",
    id: 98512,
    english: "18if",
    romaji: "18if",
    expectIdIncludes: "castellano",
  },
  {
    label: "audio:audio-latino",
    id: 269,
    english: "Bleach",
    romaji: "BLEACH",
    expectIdIncludes: "audio-latino",
  },
  {
    label: "audio:audio-castellano",
    id: 1081,
    english: "Space Pirate Captain Herlock: Outside Legend The Endless Odyssey",
    romaji: "SPACE PIRATE CAPTAIN HERLOCK: OUTSIDE LEGEND - The Endless Odyssey",
    expectIdIncludes: "audio-castellano",
  },
  {
    label: "audio:audio-japones",
    id: 107912,
    english: "Scissor Seven",
    romaji: "Cike Wu Liuqi",
    expectIdIncludes: "scissor-seven",
  },
  {
    label: "audio:catalan",
    id: 141902,
    english: "One Piece Film: Red",
    romaji: "ONE PIECE FILM: RED",
    expectIdIncludes: "one-piece-film-red",
  },
  {
    label: "audio:card-only",
    id: 196935,
    english: "Akane-banashi",
    romaji: "Akane-banashi",
    expectIdIncludes: "akane-banashi",
  },
  {
    label: "season:sN",
    id: 21087,
    english: "Assassination Classroom 2nd Season",
    romaji: "Ansatsu Kyoushitsu 2nd Season",
    expectIdIncludes: "s2",
  },
  {
    label: "season:season-N",
    id: 163024,
    english: "Captain Tsubasa: Junior Youth Arc",
    romaji: "Captain Tsubasa: Season 2 - Junior Youth-hen",
    expectIdIncludes: "captain-tsubasa",
  },
  {
    label: "season:ordinal-aggretsuko",
    id: 101571,
    english: "Aggretsuko",
    romaji: "Aggressive Retsuko",
    expectIdIncludes: "retsuko",
  },
  {
    label: "season:trailing-number",
    id: 16982,
    english: "Hayate the Combat Butler: Cuties",
    romaji: "Hayate no Gotoku!: Cuties",
    expectIdIncludes: "hayate",
  },
  {
    label: "season:part-movie",
    id: 87505,
    english: "Chain Chronicle: Haecceitas no Hikari Part 1",
    romaji: "Chain Chronicle: Haecceitas no Hikari Part 1",
    expectIdIncludes: "chain-chronicle",
  },
  {
    label: "title:colon",
    id: 113231,
    english: "2.43: Seiin High School Boys Volleyball Team",
    romaji: "2.43: Seiin Koukou Danshi Volley-bu",
    expectIdIncludes: "243",
  },
  {
    label: "title:paren",
    id: 21025,
    english: "6HP(Six Hearts Princess)",
    romaji: "6HP(Six Hearts Princess)",
    expectIdIncludes: "6hp",
  },
  {
    label: "title:ampersand",
    id: 107651,
    english: "A3! Season Spring & Summer",
    romaji: "A3! SEASON SPRING ＆ SUMMER",
    expectIdIncludes: "a3",
  },
  {
    label: "title:numeric-leading",
    id: 116242,
    english: "I'm Standing on a Million Lives",
    romaji: "100-man no Inochi no Ue ni Ore wa Tatteiru",
    expectIdIncludes: "100-man",
  },
  {
    label: "title:numeric-dot-slash",
    id: 4672,
    english: "Ghost in the Shell 2.0",
    romaji: "GHOST IN THE SHELL: Koukaku Kidoutai 2.0",
    expectIdIncludes: "ghost-in-the-shell",
  },
  {
    label: "title:numeric-compact",
    id: 2730,
    english: "1+2=Paradise",
    romaji: "1+2=Paradise",
    expectIdIncludes: "12paradise",
  },
  {
    label: "format:movie",
    id: 139643,
    english: "Drifting Home",
    romaji: "Ame wo Tsugeru Hyouryuu Danchi",
    expectIdIncludes: "ame-wo-tsugeru",
  },
  {
    label: "format:ova",
    id: 21138,
    english: "Yona of the Dawn OVA",
    romaji: "Akatsuki no Yona OVA",
    expectIdIncludes: "akatsuki-no-yona",
  },
  {
    label: "format:special",
    id: 21043,
    english: "ARIA The AVVENIRE",
    romaji: "ARIA The AVVENIRE",
    expectIdIncludes: "aria-the-avvenire",
  },
  {
    label: "format:ona",
    id: 120046,
    english: "Take My Brother Away! 4",
    romaji: "Ani ni Tsukeru Kusuri wa Nai! 4",
    expectIdIncludes: "ani-ni-tsukeru",
  },
  {
    label: "format:music",
    id: 113979,
    english: "Outburst Dreamer Boys",
    romaji: "Chuubyou Gekihatsu Boy",
    expectIdIncludes: "chuubyou",
  },
];

if (import.meta.main) {
  const provider = new Provider();
  let failures = 0;
  const suiteStart = performance.now();
  const timings: { label: string; ms: number }[] = [];

  for (const c of CASES) {
    const searchStart = performance.now();
    const results = await provider.search({
      media: {
        id: c.id,
        englishTitle: c.english,
        romajiTitle: c.romaji,
        synonyms: c.synonyms ?? [],
        isAdult: false,
      },
      query: c.romaji,
      dub: true,
    });
    const ms = Math.round(performance.now() - searchStart);
    timings.push({ label: c.label, ms });
    const pick = results[0];
    let ok = false;
    let detail = "";

    if (pick && c.expectMiss) {
      detail = `expected catalog miss, got ${pick.id}`;
    } else if (!pick && c.expectMiss) {
      ok = true;
      detail = "expected miss";
    } else if (!pick) {
      detail = "no results";
    } else if (c.expectIdIncludes && !pick.id.includes(c.expectIdIncludes)) {
      detail = `id ${pick.id} missing "${c.expectIdIncludes}"`;
    } else if (c.expectIdExcludes && pick.id.includes(c.expectIdExcludes)) {
      detail = `id ${pick.id} must not include "${c.expectIdExcludes}"`;
    } else {
      ok = true;
      detail = pick.id;
    }

    console.log(
      `${ok ? "OK " : "FAIL"} [${c.label}] ${c.english} → ${detail} (${ms}ms)`,
    );
    if (!ok) failures++;
  }

  const totalMs = Math.round(performance.now() - suiteStart);
  const slowest = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 5);
  console.log(`\n${CASES.length} searches in ${totalMs}ms`);
  console.log("Slowest:");
  for (const { label, ms } of slowest) {
    console.log(`  ${ms}ms  ${label}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    Deno.exit(1);
  }
}
