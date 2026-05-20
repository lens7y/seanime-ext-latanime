/// <reference path="../src/core.d.ts" />
/// <reference path="../src/online-streaming-provider.d.ts" />

import { loadProvider } from "./load-provider.ts";

const Provider = await loadProvider();

type SmokeCase = {
  label: string;
  id: number;
  english: string;
  romaji: string;
  synonyms?: string[];
  format?: string;
  absoluteSeasonOffset?: number;
  expectIdIncludes?: string;
  expectIdExcludes?: string;
  expectMiss?: boolean;
};

const CASES: SmokeCase[] = [
  // --- regressions ---
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
    label: "regression:call-of-the-night-s1",
    id: 141391,
    english: "Call of the Night",
    romaji: "Yofukashi no Uta",
    expectIdIncludes: "castellano",
    expectIdExcludes: "yofukashi-no-uta",
  },
  {
    label: "regression:call-of-the-night-s2",
    id: 175914,
    english: "Call of the Night Season 2",
    romaji: "Yofukashi no Uta Season 2",
    expectIdIncludes: "temporada-2",
    expectIdExcludes: "yofukashi-no-uta",
  },
  // --- risk ---
  {
    label: "risk:true-alias",
    id: 21234,
    english: "ERASED",
    romaji: "Boku dake ga Inai Machi",
    expectMiss: true,
  },
  // --- title shapes ---
  {
    label: "title:dash",
    id: 20623,
    english: "Parasyte -the maxim-",
    romaji: "Kiseijuu: Sei no Kakuritsu",
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
    format: "MOVIE",
    expectIdIncludes: "ghost-in-the-shell-20",
    expectIdExcludes: "ghost-in-the-shell-latino",
  },
  {
    label: "title:numeric-compact",
    id: 2730,
    english: "1+2=Paradise",
    romaji: "1+2=Paradise",
    expectIdIncludes: "12paradise",
  },
  // --- seasons ---
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
    label: "season:sN",
    id: 21170,
    english: "Assassination Classroom Second Season",
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
    absoluteSeasonOffset: 4,
    expectIdIncludes: "temporada-4",
  },
  {
    label: "season:part-movie",
    id: 87505,
    english: "Chain Chronicle: Haecceitas no Hikari Part 1",
    romaji: "Chain Chronicle: Haecceitas no Hikari Part 1",
    expectIdIncludes: "chain-chronicle",
  },
  // --- audio ---
  {
    label: "audio:prefer-latino",
    id: 101302,
    english: "Dragon Ball Super: Broly",
    romaji: "Dragon Ball Super: Broly",
    expectIdIncludes: "latino",
    expectIdExcludes: "castellano",
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
    label: "audio:card-only",
    id: 196935,
    english: "Akane-banashi",
    romaji: "Akane-banashi",
    expectIdIncludes: "akane-banashi",
  },
  // --- catalog shape ---
  {
    label: "shape:plain-single",
    id: 98472,
    english: "Africa no Salaryman",
    romaji: "Africa no Salaryman",
    expectIdIncludes: "africa-no-salaryman",
  },
  // --- format ---
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
    format: "ONA",
    expectIdIncludes: "ani-ni-tsukeru-kusuri-wa-nai-4",
    expectIdExcludes: "ani-ni-tsukeru-kusuri-wa-nai-3",
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
        format: c.format,
        absoluteSeasonOffset: c.absoluteSeasonOffset,
      },
      query: c.english || c.romaji,
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
