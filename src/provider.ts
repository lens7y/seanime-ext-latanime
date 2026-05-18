/// <reference path="./core.d.ts" />
/// <reference path="./online-streaming-provider.d.ts" />

const DUB_MARKERS = [
  "latino",
  "audio latino",
  "audio castellano",
  "castellano",
];

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

const SLUG_SUFFIXES = [
  "latino",
  "castellano",
  "japones",
  "audio-latino",
  "audio-castellano",
];

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
      supportsDub: true,
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

  private _subOrDub(title: string): SubOrDub {
    const lower = title.toLowerCase();
    return DUB_MARKERS.some((marker) => lower.includes(marker)) ? "dub" : "sub";
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

    for (const title of spanishTitles) add(title);
    add(opts.query);
    add(opts.media?.englishTitle ?? "");
    add(opts.media?.romajiTitle ?? "");

    for (const synonym of synonyms) {
      if (!this._looksSpanish(synonym)) add(synonym);
    }

    return queries;
  }

  private _titleBaseForSlug(title: string): string {
    return title
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

  private _slugVariants(value: string): string[] {
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

    return [...variants];
  }

  private _candidateAnimeIds(
    opts: SearchOptions,
    synonyms: string[],
    spanishTitles: string[],
  ): string[] {
    const candidates = new Set<string>();
    const titles = [
      ...spanishTitles,
      opts.query,
      opts.media?.englishTitle ?? "",
      opts.media?.romajiTitle ?? "",
      ...synonyms,
    ].filter(Boolean);

    for (const title of titles) {
      const slugSources = [title, this._titleBaseForSlug(title)].filter(Boolean);

      for (const source of slugSources) {
        for (const slug of this._slugVariants(source)) {
          this._addSlugCandidates(candidates, slug);
        }
      }
    }

    return [...candidates];
  }

  private _filterByDub(results: SearchResult[], dub: boolean): SearchResult[] {
    if (!dub) return results;
    const dubTypes: SubOrDub[] = ["dub", "both"];
    return results.filter((result) => dubTypes.includes(result.subOrDub));
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

      seen.add(id);
      results.push({
        id,
        title,
        url: href,
        subOrDub: this._subOrDub(title),
      });
    }

    return results;
  }

  private _parseTitle(html: string): string {
    const selectors: { pattern: RegExp; pick: (match: RegExpMatchArray) => string }[] =
      [
        {
          pattern: /<h1[^>]*>([\s\S]*?)<\/h1>/i,
          pick: (match) => this._stripTags(match[1]),
        },
        {
          pattern: /<h2[^>]*>([\s\S]*?)<\/h2>/i,
          pick: (match) => this._stripTags(match[1]),
        },
        {
          pattern:
            /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
          pick: (match) => this._decodeHtml(match[1]).trim(),
        },
      ];

    for (const { pattern, pick } of selectors) {
      const match = html.match(pattern);
      if (match) return pick(match);
    }

    return "";
  }

  private async _searchCandidateIds(
    opts: SearchOptions,
    synonyms: string[],
    spanishTitles: string[],
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    const ids = this._candidateAnimeIds(opts, synonyms, spanishTitles).slice(
      0,
      48,
    );
    const batchSize = 6;

    for (let i = 0; i < ids.length; i += batchSize) {
      await Promise.all(
        ids.slice(i, i + batchSize).map(async (id) => {
          const url = `${this.baseUrl}/anime/${id}`;
          const html = await this._fetchText(url);
          if (!html || !html.includes("/ver/") || seen.has(id)) return;

          const title = this._parseTitle(html) || id.replace(/-/g, " ");
          seen.add(id);
          results.push({
            id,
            title,
            url,
            subOrDub: this._subOrDub(title),
          });
        }),
      );
    }

    return results;
  }

  async search(opts: SearchOptions): Promise<SearchResult[]> {
    const synonyms = await this._resolveSynonyms(opts);
    const spanishTitles = this._spanishTitles(synonyms);
    const merged: SearchResult[] = [];
    const seen = new Set<string>();

    for (const query of this._searchQueries(opts, synonyms, spanishTitles)) {
      const url = `${this.baseUrl}/buscar?q=${encodeURIComponent(query)}`;
      const html = await this._fetchText(url);
      const results = this._parseSearchResults(html);

      for (const result of results) {
        if (seen.has(result.id)) continue;
        seen.add(result.id);
        merged.push(result);
      }

      const filtered = this._filterByDub(merged, opts.dub);
      if (filtered.length > 0) return filtered;
    }

    if (merged.length > 0) return this._filterByDub(merged, opts.dub);

    const candidates = await this._searchCandidateIds(
      opts,
      synonyms,
      spanishTitles,
    );
    return this._filterByDub(candidates, opts.dub);
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
