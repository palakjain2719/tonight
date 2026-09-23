import type { MediaType, Title } from "@/types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  9648: "Mystery",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10768: "War & Politics",
  37: "Western",
};

export const LANGUAGE_ISO: Record<string, string> = {
  hindi: "hi",
  english: "en",
  tamil: "ta",
  telugu: "te",
  kannada: "kn",
};

interface DiscoverParams {
  mediaType: MediaType;
  genres: number[];
  excludeGenres: number[];
  languageIsoCodes: string[]; // empty = no language filter
  yearFrom: number;
  yearTo: number;
  minVoteAverage: number;
  keywordIds: number[];
  sortBy: string;
  page: number;
}

function tmdbHeaders() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY is not set in .env.local.");
  }
  // Supports either a v3 API key (query param) or a v4 read access token (bearer).
  if (key.startsWith("eyJ")) {
    return { Authorization: `Bearer ${key}` };
  }
  return {} as Record<string, string>;
}

function tmdbQueryKey() {
  const key = process.env.TMDB_API_KEY;
  return key && !key.startsWith("eyJ") ? key : null;
}

async function tmdbFetch(path: string, params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${TMDB_BASE}${path}`);
  const apiKey = tmdbQueryKey();
  if (apiKey) url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: tmdbHeaders(), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * TMDB's discover `with_keywords` filter takes numeric keyword ids, not free
 * text, so Claude's plain-English keyword phrases have to be resolved first.
 * Unmatched phrases are silently dropped rather than failing the whole pool.
 */
export async function resolveKeywordIds(phrases: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const phrase of phrases) {
    try {
      const json = await tmdbFetch("/search/keyword", { query: phrase, page: 1 });
      const match = (json.results || [])[0];
      if (match?.id) ids.push(match.id);
    } catch {
      // Skip phrases TMDB's keyword search can't resolve.
    }
  }
  return ids;
}

interface RawTmdbResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  genre_ids: number[];
  original_language: string;
}

function yearOf(r: RawTmdbResult): number | null {
  const date = r.release_date || r.first_air_date;
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function toTitle(r: RawTmdbResult, mediaType: MediaType): Title {
  const genreTable = mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
  return {
    tmdbId: r.id,
    mediaType,
    title: (r.title || r.name || "Untitled").trim(),
    year: yearOf(r),
    posterPath: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : null,
    overview: r.overview || "",
    runtime: null,
    imdbRating: typeof r.vote_average === "number" ? Math.round(r.vote_average * 10) / 10 : null,
    genres: r.genre_ids.map((id) => genreTable[id]).filter(Boolean) as string[],
  };
}

async function discoverOne(params: DiscoverParams): Promise<{ results: RawTmdbResult[]; mediaType: MediaType }> {
  const path = params.mediaType === "movie" ? "/discover/movie" : "/discover/tv";
  const dateFromKey = params.mediaType === "movie" ? "primary_release_date.gte" : "first_air_date.gte";
  const dateToKey = params.mediaType === "movie" ? "primary_release_date.lte" : "first_air_date.lte";

  const json = await tmdbFetch(path, {
    include_adult: false,
    language: "en-US",
    sort_by: params.sortBy,
    "vote_count.gte": 30,
    "vote_average.gte": params.minVoteAverage,
    with_genres: params.genres.join(",") || undefined,
    without_genres: params.excludeGenres.join(",") || undefined,
    with_keywords: params.keywordIds.join("|") || undefined,
    [dateFromKey]: `${params.yearFrom}-01-01`,
    [dateToKey]: `${params.yearTo}-12-31`,
    page: params.page,
  });

  const results: RawTmdbResult[] = json.results || [];
  const filtered =
    params.languageIsoCodes.length > 0
      ? results.filter((r) => params.languageIsoCodes.includes(r.original_language))
      : results;

  return { results: filtered, mediaType: params.mediaType };
}

export interface PoolQuery {
  mediaTypes: MediaType[];
  movieGenres: number[];
  tvGenres: number[];
  excludeGenres: number[];
  languageIsoCodes: string[];
  yearFrom: number;
  yearTo: number;
  minVoteAverage: number;
  keywords: string[];
  sortBy: string;
  excludeTmdbIds: Set<string>; // `${mediaType}:${id}`
  count: number;
}

export async function buildTitlePool(query: PoolQuery): Promise<Title[]> {
  const seen = new Set(query.excludeTmdbIds);
  const pool: Title[] = [];
  const keywordIds = query.keywords.length ? await resolveKeywordIds(query.keywords) : [];

  for (const mediaType of query.mediaTypes) {
    const genres = mediaType === "movie" ? query.movieGenres : query.tvGenres;
    // Pull a couple of pages per media type, and fall back to a
    // genre-agnostic sweep if the strict filters come up short.
    for (const page of [1, 2, 3]) {
      if (pool.length >= query.count) break;
      const { results } = await discoverOne({
        mediaType,
        genres,
        excludeGenres: query.excludeGenres,
        languageIsoCodes: query.languageIsoCodes,
        yearFrom: query.yearFrom,
        yearTo: query.yearTo,
        minVoteAverage: query.minVoteAverage,
        keywordIds,
        sortBy: query.sortBy,
        page,
      });
      for (const r of results) {
        const key = `${mediaType}:${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(toTitle(r, mediaType));
      }
    }
  }

  if (pool.length < query.count) {
    for (const mediaType of query.mediaTypes) {
      if (pool.length >= query.count) break;
      const { results } = await discoverOne({
        mediaType,
        genres: [],
        excludeGenres: query.excludeGenres,
        languageIsoCodes: query.languageIsoCodes,
        yearFrom: query.yearFrom,
        yearTo: query.yearTo,
        minVoteAverage: query.minVoteAverage,
        keywordIds: [],
        sortBy: "popularity.desc",
        page: 1,
      });
      for (const r of results) {
        const key = `${mediaType}:${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(toTitle(r, mediaType));
      }
    }
  }

  const trimmed = pool.slice(0, query.count);
  await attachRuntimes(trimmed);
  return trimmed;
}

async function attachRuntimes(titles: Title[], concurrency = 8): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < titles.length) {
      const i = cursor++;
      const t = titles[i];
      if (!t) continue;
      t.runtime = await fetchRuntime(t.tmdbId, t.mediaType);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, titles.length) }, worker));
}

export async function fetchRuntime(tmdbId: number, mediaType: MediaType): Promise<number | null> {
  try {
    const path = mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    const json = await tmdbFetch(path, {});
    if (mediaType === "movie") return json.runtime ?? null;
    const episodeRuntimes: number[] = json.episode_run_time || [];
    return episodeRuntimes[0] ?? null;
  } catch {
    return null;
  }
}
