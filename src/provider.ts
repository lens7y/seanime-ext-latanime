/// <reference path="./core.d.ts" />
/// <reference path="./online-streaming-provider.d.ts" />

const SLUG_SUFFIXES_DUB = ["latino", "castellano", "audio-latino", "audio-castellano"];
const SLUG_SUFFIXES_SUB = ["japones"];

const CHALLENGE_MARKERS = [
  "Just a moment...",
  "cf_chl",
  "Enable JavaScript and cookies to continue",
];

const SPANISH_PARTICLES = new Set([
  "de",
  "la",
  "el",
  "del",
  "los",
  "las",
  "y",
  "un",
  "una",
]);

const SLUG_SUFFIXES = [...SLUG_SUFFIXES_DUB, ...SLUG_SUFFIXES_SUB];

const SERVER_URL_RULES: { needles: string[]; name: string }[] = [
  { needles: ["filemoon"], name: "filemoon" },
  { needles: ["ok.ru"], name: "ok" },
  { needles: ["mixdrop"], name: "mixdrop" },
  { needles: ["mxdrop"], name: "mxdrop" },
  { needles: ["dood", "d0000d"], name: "doodstream" },
  { needles: ["yourupload"], name: "yourupload" },
  { needles: ["wolf"], name: "wolf" },
  { needles: ["mp4upload"], name: "mp4upload" },
  { needles: ["mega.nz"], name: "mega" },
  { needles: ["uqload"], name: "uqload" },
  { needles: ["lulustream", "lulu"], name: "lulu" },
  { needles: ["listeamed"], name: "listeamed" },
  { needles: ["hlswish"], name: "hlswish" },
  { needles: ["voe.sx", "voe."], name: "voe" },
];

const SERVER_ALIASES: Record<string, string[]> = {
  mxdrop: ["mixdrop"],
  mixdrop: ["mxdrop"],
};

const PREFERRED_SERVERS = [
  "mp4upload",
  "mxdrop",
  "voe",
  "lulu",
  "listeamed",
  "filemoon",
  "doodstream",
  "mixdrop",
  "ok",
  "hlswish",
];

const SEASON_SLUG_RULES: {
  pattern: RegExp;
  format: (base: string, season: string) => string;
}[] = [
  {
    pattern: /^(.*?)-temporada-(\d+)$/,
    format: (base, season) => `${base}-s${season}`,
  },
  {
    pattern: /^(.*?)-s(\d+)$/,
    format: (base, season) => `${base}-temporada-${season}`,
  },
  {
    pattern: /^(.*?)-(?:season-)?(\d+)(?:st|nd|rd|th)?-season$/,
    format: (base, season) => `${base}-s${season}`,
  },
  {
    pattern: /^(.*?)-season-(\d+)$/,
    format: (base, season) => `${base}-s${season}`,
  },
  {
    pattern: /^(.*?)-(\d+)(?:st|nd|rd|th)$/,
    format: (base, season) => `${base}-s${season}`,
  },
];

const SLUG_STRIP_SUFFIXES = ["-tv", "-the-animation"];

const DIRECT_STREAM_RULES: { pattern: RegExp; type: VideoSourceType }[] = [
  { pattern: /\.(m3u8)(?:$|\?)/i, type: "m3u8" },
  { pattern: /\.(mp4)(?:$|\?)/i, type: "mp4" },
];

// deno-lint-ignore no-unused-vars
class Provider {
  baseUrl = "https://latanime.org";
  private _anilistSynonymsCache: Record<number, string[]> = {};

  getSettings(): Settings {
    return {
      episodeServers: [
        "mp4upload",
        "mxdrop",
        "filemoon",
        "ok",
        "mixdrop",
        "doodstream",
        "yourupload",
        "wolf",
        "mega",
        "uqload",
        "lulu",
        "listeamed",
        "hlswish",
        "voe",
      ],
      supportsDub: false,
    };
  }

  private _headers(referer = this.baseUrl): { [key: string]: string } {
    return {
      Referer: referer,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    };
  }

  private _decodeHtml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ");
  }

  private _stripTags(value: string): string {
    return this._decodeHtml(value.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
  }

  private _absoluteUrl(url: string): string {
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return this.baseUrl + url;
    return url;
  }

  private _animeIdFromUrl(url: string): string {
    return this._absoluteUrl(url)
      .replace(this.baseUrl, "")
      .replace(/^\/anime\//, "")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
  }

  private _normalizeAudioText(...parts: (string | undefined)[]): string {
    return parts
      .filter(Boolean)
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  private _detectSubOrDub(sources: {
    title?: string;
    id?: string;
    badge?: string;
    spanLabel?: string;
  }): SubOrDub {
    const text = this._normalizeAudioText(
      sources.title,
      sources.id,
      sources.badge,
      sources.spanLabel,
    );
    if (!text) return "sub";

    const hasLatino =
      /\blatino\b/.test(text) ||
      /(?:^|-)latino(?:-|$)/.test(text) ||
      /audio-latino/.test(text);
    const hasCastellano =
      /\bcastellano\b/.test(text) ||
      /(?:^|-)castellano(?:-|$)/.test(text) ||
      /audio-castellano/.test(text);
    const hasCatalan = /\bcatalan\b/.test(text);
    const hasDub = hasLatino || hasCastellano || hasCatalan;

    const hasSub =
      /\bjapones\b/.test(text) ||
      /\bsubtitulado\b/.test(text) ||
      /(?:^|-)japones(?:-|$)/.test(text) ||
      /\baudio\s+japones\b/.test(text);

    if (hasDub && hasSub) return "both";
    if (hasDub) return "dub";
    if (hasSub) return "sub";

    if (
      /\b(anime|pelicula|ona|cartoon)\b/.test(text) &&
      !hasLatino &&
      !hasCastellano &&
      !hasCatalan
    ) {
      return "sub";
    }

    return "sub";
  }

  private _dubVariantRank(result: SearchResult): number {
    const text = this._normalizeAudioText(result.title, result.id);
    if (/\blatino\b/.test(text) || /(?:^|-)latino(?:-|$)/.test(text)) return 30;
    if (/\bcastellano\b/.test(text) || /(?:^|-)castellano(?:-|$)/.test(text)) {
      return 20;
    }
    if (/\bcatalan\b/.test(text)) return 15;
    if (result.subOrDub === "dub" || result.subOrDub === "both") return 10;
    return 0;
  }

  private _parseSeriesDetailsLabel(html: string): string {
    const idx = html.search(/\bseriedetails\b/i);
    if (idx < 0) return "";
    const slice = html.slice(idx, idx + 2500);
    const spans = [...slice.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)];
    const labels = spans
      .map((m) => this._stripTags(m[1]))
      .filter((s) => s && s.length < 80);
    return labels.join(" ");
  }


  private _parseSearchCardBadge(inner: string): string {
    const withoutH3 = inner.replace(/<h3[\s\S]*?<\/h3>/gi, "");
    return this._stripTags(withoutH3).replace(/\s+\d{4}\s*$/, "").trim();
  }

  private _looksSpanish(title: string): boolean {
    // deno-lint-ignore no-control-regex
    if (/[^\u0000-\u024F]/.test(title.replace(/[\s\d:,'.\-]/g, ""))) return false;

    const normalized = title.normalize("NFD");
    if (/[\u0300-\u036f]/.test(normalized)) return true;

    const words = title.toLowerCase().split(/\s+/).filter(Boolean);
    let hits = 0;
    for (const word of words) {
      if (SPANISH_PARTICLES.has(word)) hits++;
    }
    return hits >= 2 || (hits >= 1 && words.length >= 3);
  }

  private async _fetchAnilistSynonyms(mediaId: number): Promise<string[]> {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query:
            "query ($id: Int) { Media(id: $id, type: ANIME) { synonyms } }",
          variables: { id: mediaId },
        }),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data?.Media?.synonyms ?? [];
    } catch {
      return [];
    }
  }

  private async _resolveSynonyms(opts: SearchOptions): Promise<string[]> {
    const local = opts.media?.synonyms ?? [];
    if (local.length > 0) return local;
    const id = opts.media?.id;
    if (!id) return [];
    if (id in this._anilistSynonymsCache) return this._anilistSynonymsCache[id];

    const synonyms = await this._fetchAnilistSynonyms(id);
    this._anilistSynonymsCache[id] = synonyms;
    return synonyms;
  }

  private _extractSeasonNumber(title: string): number {
    if (typeof $scannerUtils !== "undefined") {
      return $scannerUtils.extractSeasonNumber(title);
    }
    const patterns = [
      /\bseason\s*(\d+)\b/i,
      /\bS(\d{1,2})\b/,
      /\bs(\d{1,2})\b/i,
      /\b(\d+)(?:st|nd|rd|th)\s+season\b/i,
      /\btemporada\s*(\d+)\b/i,
      /\b(\d+)\s* temporada\b/i,
    ];
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) return parseInt(match[1], 10);
    }
    const trailing = title.match(/\s(\d{1,2})$/);
    if (trailing) {
      const n = parseInt(trailing[1], 10);
      if (n >= 1 && n <= 30) return n;
    }
    // Kaguya-sama: Love is War? (AniList S2 title — "?" not a season digit)
    if (/\blove\s+is\s+war\s*\?+\s*$/i.test(title)) return 2;
    return -1;
  }

  private _stripSeasonFromTitle(title: string): string {
    return title
      .replace(/\b(?:season|temporada)\s*\d+(?:\s*part\s*\d+)?\b/gi, "")
      .replace(/\b\d+(?:st|nd|rd|th)\s+season(?:\s*part\s*\d+)?\b/gi, "")
      .replace(/\bpart\s+\d+\b/gi, "")
      .replace(/\s+\d{1,2}$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Short Latanime slugs (e.g. parasyte-latino, love-is-war) from English/romaji titles. */
  private _franchiseSlugHints(...titles: (string | undefined)[]): string[] {
    const hints = new Set<string>();

    for (const title of titles) {
      if (!title) continue;
      const cleaned = title.replace(/\?+$/g, "").trim();
      if (!cleaned) continue;

      const colonPart = cleaned.split(":")[1]?.trim();
      if (colonPart && colonPart.length >= 3) {
        const slug = this._slugify(colonPart);
        if (slug) hints.add(slug);
      }

      const dashLead = cleaned.match(/^([^-:]{2,48}?)\s*-\s*/);
      if (dashLead) {
        const slug = this._slugify(dashLead[1]);
        if (slug) hints.add(slug);
      }

      const beforeColon = cleaned.split(":")[0]?.trim();
      if (beforeColon && beforeColon.length >= 3) {
        const slug = this._slugify(beforeColon);
        if (slug) hints.add(slug);
      }
    }

    return [...hints];
  }

  private _franchiseSearchTerms(...titles: (string | undefined)[]): string[] {
    const terms: string[] = [];
    const seen = new Set<string>();
    for (const slug of this._franchiseSlugHints(...titles)) {
      const term = slug.replace(/-/g, " ");
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push(term);
    }
    return terms;
  }

  private _detectSeason(opts: SearchOptions, synonyms: string[]): number {
    const titles = [
      opts.query,
      opts.media?.englishTitle ?? "",
      opts.media?.romajiTitle ?? "",
      ...synonyms,
    ].filter(Boolean);

    let season = -1;
    for (const title of titles) {
      const found = this._extractSeasonNumber(title);
      if (found > season) season = found;
    }
    return season;
  }

  private _compactShowName(title: string): string {
    const base = title.split(/[:(]/)[0]?.trim() ?? title.trim();
    const stripped = this._stripSeasonFromTitle(base);
    return stripped || base || title.trim();
  }

  private _spanishTitles(synonyms: string[]): string[] {
    const titles: string[] = [];
    const seen = new Set<string>();

    for (const synonym of synonyms) {
      if (!this._looksSpanish(synonym)) continue;
      const key = synonym.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(synonym);
    }

    return titles;
  }

  private _searchQueries(
    opts: SearchOptions,
    synonyms: string[],
    spanishTitles: string[],
    season: number,
  ): string[] {
    const queries: string[] = [];
    const seen = new Set<string>();
    const add = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      queries.push(trimmed);
    };

    const english = opts.media?.englishTitle ?? "";
    const romaji = opts.media?.romajiTitle ?? "";

    add(english);
    for (const term of this._franchiseSearchTerms(english, romaji, opts.query)) {
      add(term);
    }
    if (season > 1) {
      const short = this._compactShowName(english);
      if (short) {
        add(`${short} S${season}`);
        add(`${short} temporada ${season}`);
        add(`${short} Season ${season}`);
      }
      const romajiShort = this._compactShowName(romaji);
      if (romajiShort && romajiShort.toLowerCase() !== short?.toLowerCase()) {
        add(`${romajiShort} S${season}`);
        add(`${romajiShort} ${season}`);
      }
      if (typeof $scannerUtils !== "undefined" && english) {
        const seasonQuery = $scannerUtils.buildSeasonQuery(english, season);
        const parts = seasonQuery.replace(/^\(|\)$/g, "").split("|").map((p) =>
          p.trim()
        );
        for (const part of parts) add(part);
      }
    }

    add(opts.query);
    add(romaji);

    for (const title of spanishTitles) add(title);

    for (const synonym of synonyms) {
      if (!this._looksSpanish(synonym)) add(synonym);
    }

    return queries;
  }

  private _titleBaseForSlug(title: string): string {
    return title
      .replace(/\s*-\s*the\s+maxim\s*-?\s*/gi, " ")
      .replace(
        /\b(?:audio\s+)?(?:latino|castellano|japones|japonés|subtitulado)\b/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
  }

  private _addSlugCandidates(candidates: Set<string>, slug: string): void {
    if (!slug) return;

    candidates.add(slug);
    for (const suffix of SLUG_SUFFIXES) {
      candidates.add(`${slug}-${suffix}`);
    }
  }

  private _slugify(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " y ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private _addSeasonSlugVariants(
    variants: Set<string>,
    slug: string,
    season: number,
  ): void {
    if (season <= 1) return;

    variants.add(`${slug}-temporada-${season}`);
    variants.add(`${slug}-s${season}`);
    variants.add(`${slug}-season-${season}`);
  }

  private _slugVariants(value: string, season = -1): string[] {
    const variants = new Set<string>();
    const slug = this._slugify(value);
    if (!slug) return [];

    variants.add(slug);

    for (const rule of SEASON_SLUG_RULES) {
      const match = slug.match(rule.pattern);
      if (match) variants.add(rule.format(match[1], match[2]));
    }

    for (const suffix of SLUG_STRIP_SUFFIXES) {
      if (slug.endsWith(suffix)) variants.add(slug.slice(0, -suffix.length));
    }

    if (season > 1) {
      for (const base of [...variants]) {
        this._addSeasonSlugVariants(variants, base, season);
      }
    }

    return [...variants];
  }

  private _candidateAnimeIds(
    opts: SearchOptions,
    synonyms: string[],
    spanishTitles: string[],
    season: number,
  ): string[] {
    const candidates = new Set<string>();
    const primary = [
      opts.media?.englishTitle ?? "",
      opts.media?.romajiTitle ?? "",
      opts.query,
      ...spanishTitles,
    ].filter(Boolean);
    const primaryKeys = new Set(primary.map((t) => t.toLowerCase()));
    const secondary = synonyms.filter((s) => !primaryKeys.has(s.toLowerCase()));
    const titles = [...primary, ...secondary];

    for (const title of titles) {
      const slugSources = [title, this._titleBaseForSlug(title)].filter(Boolean);

      for (const source of slugSources) {
        for (const slug of this._slugVariants(source, season)) {
          this._addSlugCandidates(candidates, slug);
        }
        for (const hint of this._franchiseSlugHints(source)) {
          this._addSlugCandidates(candidates, hint);
        }
      }
    }

    return this._prioritizeCandidateIds([...candidates], season);
  }

  private _prioritizeCandidateIds(ids: string[], season: number): string[] {
    if (season <= 1) return ids;

    const score = (id: string): number => {
      let s = 0;
      if (new RegExp(`-s${season}(?:-|$)`).test(id)) s += 20;
      if (id.includes(`-temporada-${season}`)) s += 18;
      if (id.includes(`-season-${season}`)) s += 16;
      // Combined multi-season pages (love-is-war = S1 y S2)
      if (!/-s\d+(?:-|$)|-temporada-\d|-season-\d/.test(id)) s += 12;
      if (id.includes("-latino")) s += 5;
      if (id.includes("-castellano")) s += 3;
      return s;
    };

    return [...ids].sort((a, b) => score(b) - score(a));
  }

  private _idSeasonNumber(id: string): number {
    const temporada = id.match(/-temporada-(\d+)(?:-|$)/);
    if (temporada) return parseInt(temporada[1], 10);
    const sSuffix = id.match(/-s(\d+)(?:-|$)/);
    if (sSuffix) return parseInt(sSuffix[1], 10);
    const seasonTag = id.match(/-season-(\d+)(?:-|$)/);
    if (seasonTag) return parseInt(seasonTag[1], 10);
    return -1;
  }

  private _sortSearchResults(
    results: SearchResult[],
    season: number,
    opts: SearchOptions,
  ): SearchResult[] {
    const hints = this._franchiseSlugHints(
      opts.media?.englishTitle ?? "",
      opts.media?.romajiTitle ?? "",
      opts.query,
    );

    const seasonScore = (id: string): number => {
      const idSeason = this._idSeasonNumber(id);
      if (season > 1) {
        if (idSeason === season) return 20;
        if (idSeason > 0 && idSeason !== season) return -10;
        if (/-temporada-\d+|-s\d+(?:-|$)|-season-\d+/.test(id)) return -5;
        return 0;
      }
      if (idSeason > 1) return -5;
      return 0;
    };

    const franchiseScore = (id: string): number => {
      let best = 0;
      for (const hint of hints) {
        if (id === `${hint}-latino` || id === `${hint}-castellano`) {
          best = Math.max(best, 25);
        } else if (id === hint) {
          best = Math.max(best, 22);
        } else if (id.startsWith(`${hint}-`)) {
          best = Math.max(best, 12);
        }
      }
      return best;
    };

    return [...results].sort((a, b) => {
      const seasonDiff = seasonScore(b.id) - seasonScore(a.id);
      if (seasonDiff !== 0) return seasonDiff;
      const franchiseDiff = franchiseScore(b.id) - franchiseScore(a.id);
      if (franchiseDiff !== 0) return franchiseDiff;
      return this._dubVariantRank(b) - this._dubVariantRank(a);
    });
  }

  private _pickAudioResults(results: SearchResult[]): SearchResult[] {
    const dub = results.filter((r) => r.subOrDub === "dub" || r.subOrDub === "both");
    if (dub.length > 0) return dub;
    return results.filter((r) => r.subOrDub === "sub");
  }

  private _serverName(url: string): string {
    const lower = url.toLowerCase();
    for (const rule of SERVER_URL_RULES) {
      if (rule.needles.some((needle) => lower.includes(needle))) {
        return rule.name;
      }
    }
    return "default";
  }

  private _origin(url: string): string {
    const match = url.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] : this.baseUrl;
  }

  private _decodeBase64(value: string): string {
    try {
      const input = value
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .replace(/[^A-Za-z0-9+/=]/g, "");
      if (!input) return "";
      return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(input));
    } catch {
      return "";
    }
  }

  private _normalizePlayerUrl(value: string): string {
    let url = this._decodeHtml(value)
      .replace(/\\\//g, "/")
      .replace(/%3A/gi, ":")
      .replace(/%2F/gi, "/")
      .trim();

    if (!/^https?:\/\//.test(url)) {
      const decoded = this._decodeBase64(url);
      if (/^https?:\/\//.test(decoded)) url = decoded;
    }

    return this._absoluteUrl(url);
  }

  private _isChallengePage(html: string): boolean {
    return CHALLENGE_MARKERS.some((marker) => html.includes(marker));
  }

  private async _fetchText(url: string, referer = this.baseUrl): Promise<string> {
    const res = await fetch(url, {
      credentials: "include",
      headers: this._headers(referer),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return this._isChallengePage(html) ? "" : html;
  }

  private _parseSearchResults(html: string): SearchResult[] {
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    const pattern =
      /<a\b[^>]+href=["']([^"']*\/anime\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const href = this._absoluteUrl(this._decodeHtml(match[1]));
      const id = this._animeIdFromUrl(href);
      const inner = match[2];
      const h3 = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      let title = h3 ? this._stripTags(h3[1]) : this._stripTags(inner);

      if (!id || seen.has(id)) continue;
      if (!title || title.toLowerCase() === "image") continue;

      title = title.replace(/\s+(0\.0|\d{4})$/, "").trim();
      const badge = this._parseSearchCardBadge(inner);

      seen.add(id);
      results.push({
        id,
        title,
        url: href,
        subOrDub: this._detectSubOrDub({ title, id, badge }),
      });
    }

    return results;
  }

  private _parseTitle(html: string): string {
    const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const h2 = h2Match ? this._stripTags(h2Match[1]) : "";

    const h3Match =
      html.match(
        /<h3[^>]*class=["'][^"']*\bfs-6\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i,
      ) ??
      html.match(
        /<h3[^>]*class=["'][^"']*text-light[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i,
      );
    const h3 = h3Match ? this._stripTags(h3Match[1]) : "";

    if (h2 && h3) return `${h2} / ${h3}`;
    if (h2) return h2;

    const selectors: { pattern: RegExp; pick: (match: RegExpMatchArray) => string }[] =
      [
        {
          pattern: /<h1[^>]*>([\s\S]*?)<\/h1>/i,
          pick: (match) => this._stripTags(match[1]),
        },
        {
          pattern:
            /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
          pick: (match) => this._decodeHtml(match[1]).replace(/\s*—\s*Latanime.*$/i, "").trim(),
        },
      ];

    for (const { pattern, pick } of selectors) {
      const match = html.match(pattern);
      if (match) return pick(match);
    }

    return "";
  }

  private _shouldEnrichTitle(id: string, season: number): boolean {
    if (season <= 1) return false;
    return (
      id.includes(`temporada-${season}`) ||
      new RegExp(`-s${season}(?:-|$)`).test(id)
    );
  }

  private async _enrichSearchTitles(
    results: SearchResult[],
    season: number,
  ): Promise<void> {
    const targets = results.filter((r) => this._shouldEnrichTitle(r.id, season));
    const batchSize = 6;

    for (let i = 0; i < targets.length; i += batchSize) {
      await Promise.all(
        targets.slice(i, i + batchSize).map(async (result) => {
          const html = await this._fetchText(result.url);
          if (!html) return;
          const title = this._parseTitle(html);
          if (!title) return;
          result.title = title;
          const spanLabel = this._parseSeriesDetailsLabel(html);
          result.subOrDub = this._detectSubOrDub({
            title,
            id: result.id,
            spanLabel,
          });
        }),
      );
    }
  }

  private async _searchCandidateIds(
    opts: SearchOptions,
    synonyms: string[],
    spanishTitles: string[],
    season: number,
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    const ids = this._candidateAnimeIds(opts, synonyms, spanishTitles, season).slice(
      0,
      64,
    );
    const batchSize = 6;

    for (let i = 0; i < ids.length; i += batchSize) {
      await Promise.all(
        ids.slice(i, i + batchSize).map(async (id) => {
          const url = `${this.baseUrl}/anime/${id}`;
          const html = await this._fetchText(url);
          if (!html || !html.includes("/ver/") || seen.has(id)) return;

          const title = this._parseTitle(html) || id.replace(/-/g, " ");
          const spanLabel = this._parseSeriesDetailsLabel(html);
          seen.add(id);
          results.push({
            id,
            title,
            url,
            subOrDub: this._detectSubOrDub({ title, id, spanLabel }),
          });
        }),
      );
    }

    return results;
  }

  async search(opts: SearchOptions): Promise<SearchResult[]> {
    const synonyms = await this._resolveSynonyms(opts);
    const spanishTitles = this._spanishTitles(synonyms);
    const season = this._detectSeason(opts, synonyms);
    const merged: SearchResult[] = [];
    const seen = new Set<string>();

    for (const query of this._searchQueries(opts, synonyms, spanishTitles, season)) {
      const url = `${this.baseUrl}/buscar?q=${encodeURIComponent(query)}`;
      const html = await this._fetchText(url);
      const results = this._parseSearchResults(html);

      for (const result of results) {
        if (seen.has(result.id)) continue;
        seen.add(result.id);
        merged.push(result);
      }
    }

    const candidates = await this._searchCandidateIds(
      opts,
      synonyms,
      spanishTitles,
      season,
    );
    for (const result of candidates) {
      if (seen.has(result.id)) continue;
      seen.add(result.id);
      merged.push(result);
    }

    await this._enrichSearchTitles(merged, season);
    const sorted = this._sortSearchResults(merged, season, opts);
    return this._pickAudioResults(sorted);
  }

  async findEpisodes(id: string): Promise<EpisodeDetails[]> {
    const animeId = this._animeIdFromUrl(id);
    const animeUrl = `${this.baseUrl}/anime/${animeId}`;
    const html = await this._fetchText(animeUrl);
    if (!html) return [];

    const episodes: EpisodeDetails[] = [];
    const seen = new Set<number>();
    const pattern =
      /<a\b[^>]+href=["']([^"']*\/ver\/([^"']*?)-episodio-(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const number = parseInt(match[3], 10);
      if (!number || seen.has(number)) continue;

      const url = this._absoluteUrl(this._decodeHtml(match[1]));
      const title = this._stripTags(match[4]) || `Episodio ${number}`;

      seen.add(number);
      episodes.push({
        id: url.replace(this.baseUrl, "").replace(/^\/+/, ""),
        number,
        url,
        title,
      });
    }

    if (episodes.length === 0) {
      const countMatch = html.match(/Episodios:\s*<\/[^>]+>\s*(\d+)/i);
      const total = countMatch ? parseInt(countMatch[1], 10) : 0;
      for (let i = 1; i <= total; i++) {
        const episodeUrl = `${this.baseUrl}/ver/${animeId}-episodio-${i}`;
        episodes.push({
          id: `ver/${animeId}-episodio-${i}`,
          number: i,
          url: episodeUrl,
          title: `Episodio ${i}`,
        });
      }
    }

    return episodes.sort((a, b) => a.number - b.number);
  }

  private _extractPlayerUrls(html: string): Record<string, string> {
    const map: Record<string, string> = {};
    const add = (rawUrl: string, server?: string) => {
      const url = this._normalizePlayerUrl(rawUrl);
      if (!/^https?:\/\//.test(url)) return;

      const key = (server || this._serverName(url)).toLowerCase();
      if (!(key in map)) map[key] = url;
    };

    const latanimePlayerPattern =
      /<a\b[^>]*class=["'][^"']*\bplay-video\b[^"']*["'][^>]*data-player=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(latanimePlayerPattern)) {
      add(match[1], this._stripTags(match[2]));
    }

    const iframePattern =
      /<iframe\b[^>]+src=["']([^"']+)["'][^>]*>/gi;
    for (const match of html.matchAll(iframePattern)) add(match[1]);

    const jsPattern =
      /["'](?:url|src|file|embed)["']\s*:\s*["'](https?:\/\/[^"']+)["']/gi;
    for (const match of html.matchAll(jsPattern)) add(match[1]);

    const dataPattern =
      /data-(?:url|src|embed|player)=["']([^"']+)["'][^>]*?(?:data-(?:server|name)=["']([^"']+)["'])?/gi;
    for (const match of html.matchAll(dataPattern)) add(match[1], match[2]);

    const attrPattern =
      /<[^>]+(?:data-(?:server|name)=["']([^"']+)["'][^>]+data-(?:url|src|embed|player|video)=["']([^"']+)["']|data-(?:url|src|embed|player|video)=["']([^"']+)["'][^>]+data-(?:server|name)=["']([^"']+)["'])[^>]*>/gi;
    for (const match of html.matchAll(attrPattern)) {
      add(match[2] || match[3], match[1] || match[4]);
    }

    const compactPattern =
      /(https?:\\?\/\\?\/[^"'`\s<>]+(?:\.m3u8|\.mp4|\/embed\/|\/embed-|\/e\/|\/v\/)[^"'`\s<>]*)/gi;
    for (const match of html.matchAll(compactPattern)) add(match[1]);

    const encodedUrlPattern =
      /(?:aHR0cHM6|aHR0cDov)[A-Za-z0-9+/=_-]+/g;
    for (const match of html.matchAll(encodedUrlPattern)) add(match[0]);

    return map;
  }

  private _candidateServers(
    playerMap: Record<string, string>,
    requested: string,
  ): string[] {
    if (requested) {
      const aliases = [
        requested,
        ...(SERVER_ALIASES[requested] ?? []),
      ];
      return [...new Set(aliases)].filter((name) => playerMap[name]);
    }

    const preferred = [...PREFERRED_SERVERS, ...Object.keys(playerMap)];
    return [...new Set(preferred)].filter((name) => playerMap[name]);
  }

  private _unpackPacker(source: string): string[] {
    const unpacked: string[] = [];
    const scripts = [
      ...(source.match(/eval\(function\(p,a,c,k,e,[\s\S]+?\)\)/g) ?? []),
      ...(source.match(
        /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('[\s\S]*?'\.split\('\|'\),0,\{\}\)\)/g,
      ) ?? []),
    ];

    for (const script of scripts) {
      const payload = script.match(
        /\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/,
      );
      if (!payload) continue;

      let p = payload[1];
      const radix = parseInt(payload[2], 10);
      let count = parseInt(payload[3], 10);
      const words = payload[4].split("|");

      const encode = (num: number): string =>
        num.toString(radix).replace(/\w/g, (c) => {
          const code = c.charCodeAt(0);
          return code >= 97 ? String.fromCharCode(code + 29) : c;
        });

      while (count--) {
        if (words[count]) {
          p = p.replace(new RegExp(`\\b${encode(count)}\\b`, "g"), words[count]);
        }
      }

      unpacked.push(p.replace(/\\'/g, "'").replace(/\\"/g, '"'));
    }

    return unpacked;
  }

  private _isDirectStreamUrl(url: string): boolean {
    return DIRECT_STREAM_RULES.some((rule) => rule.pattern.test(url));
  }

  private _playbackHeaders(
    episode: EpisodeDetails,
    embedUrl: string,
  ): { [key: string]: string } {
    const referer = embedUrl && !this._isDirectStreamUrl(embedUrl)
      ? embedUrl
      : episode.url;
    const origin = embedUrl && !this._isDirectStreamUrl(embedUrl)
      ? this._origin(embedUrl)
      : this.baseUrl;

    return {
      ...this._headers(referer),
      Origin: origin,
    };
  }

  private async _resolveStream(
    playerUrl: string,
    referer: string,
  ): Promise<VideoSource | null> {
    for (const rule of DIRECT_STREAM_RULES) {
      if (rule.pattern.test(playerUrl)) {
        return {
          url: playerUrl,
          type: rule.type,
          quality: "default",
          subtitles: [],
        };
      }
    }

    const html = await this._fetchText(playerUrl, referer);
    if (!html) return null;

    const candidates = [html, ...this._unpackPacker(html)];
    for (const candidate of candidates) {
      const hls = candidate.match(
        /["'`]((?:https?:)?\\?\/\\?\/[^"'`\s<>?#]+\.m3u8(?:\?[^"'`\s<>]*)?)["'`]/i,
      );
      if (hls) {
        return {
          url: this._normalizePlayerUrl(hls[1]),
          type: "m3u8",
          quality: "default",
          subtitles: [],
        };
      }

      const mp4 = candidate.match(
        /["'`]((?:https?:)?\\?\/\\?\/[^"'`\s<>?#]+\.mp4(?:\?[^"'`\s<>]*)?)["'`]/i,
      );
      if (mp4) {
        return {
          url: this._normalizePlayerUrl(mp4[1]),
          type: "mp4",
          quality: "default",
          subtitles: [],
        };
      }
    }

    return null;
  }

  async findEpisodeServer(
    episode: EpisodeDetails,
    server: string,
  ): Promise<EpisodeServer> {
    const html = await this._fetchText(episode.url);
    if (!html) return { server, headers: {}, videoSources: [] };

    const playerMap = this._extractPlayerUrls(html);
    const requested = server.toLowerCase();
    let resolvedServer = server;
    let resolvedPlayerUrl = "";
    let source: VideoSource | null = null;

    for (const candidate of this._candidateServers(playerMap, requested)) {
      const playerUrl = playerMap[candidate];
      source = await this._resolveStream(playerUrl, episode.url);
      if (source) {
        resolvedServer = candidate;
        resolvedPlayerUrl = playerUrl;
        break;
      }
    }

    return {
      server: resolvedServer,
      headers: source ? this._playbackHeaders(episode, resolvedPlayerUrl) : {},
      videoSources: source ? [source] : [],
    };
  }
}
