import { generateSearchBrief, refineSearchBrief, type HardConstraints } from "@/lib/anthropic";
import { buildTitlePool } from "@/lib/tmdb";
import { mergeContentType, mergeEraRange, mergeLanguages, mergeMinRating } from "@/lib/preferences";
import { getAllSeenTitles, getCoupleHistory, getSwipes, getTitlePool, saveBrief, saveTitlePool } from "@/lib/db";
import type { MediaType, PreferenceInput, Title } from "@/types";

const POOL_SIZE = 30;

function hardConstraintsFor(prefsA: PreferenceInput, prefsB: PreferenceInput): { hard: HardConstraints; languageIsoCodes: string[] } {
  const { yearFrom, yearTo } = mergeEraRange(prefsA.eras, prefsB.eras);
  const languageIsoCodes = mergeLanguages(prefsA.languages, prefsB.languages);
  const minVoteAverage = mergeMinRating(prefsA.minRating, prefsB.minRating);
  const contentType = mergeContentType(prefsA.contentType, prefsB.contentType);
  return { hard: { yearFrom, yearTo, minVoteAverage, contentType }, languageIsoCodes };
}

function mediaTypesFor(contentType: "movies" | "series"): MediaType[] {
  return contentType === "movies" ? ["movie"] : ["movie", "tv"];
}

export async function generateFirstRoundPool(sessionId: string, coupleId: string | null, prefsA: PreferenceInput, prefsB: PreferenceInput): Promise<Title[]> {
  const { hard, languageIsoCodes } = hardConstraintsFor(prefsA, prefsB);
  const history = await getCoupleHistory(coupleId, sessionId);

  const brief = await generateSearchBrief({ prefsA, prefsB, hardConstraints: hard, history });

  const pool = await buildTitlePool({
    mediaTypes: mediaTypesFor(hard.contentType),
    movieGenres: brief.movieGenres,
    tvGenres: brief.tvGenres,
    excludeGenres: brief.excludeGenres,
    languageIsoCodes,
    yearFrom: brief.yearFrom,
    yearTo: brief.yearTo,
    minVoteAverage: brief.minVoteAverage,
    keywords: brief.keywords,
    sortBy: brief.sortBy,
    excludeTmdbIds: new Set(),
    count: POOL_SIZE,
  });

  await saveBrief(sessionId, 1, brief);
  await saveTitlePool(sessionId, 1, pool);
  return pool;
}

export async function generateSecondRoundPool(sessionId: string, coupleId: string | null, prefsA: PreferenceInput, prefsB: PreferenceInput): Promise<Title[]> {
  const { hard, languageIsoCodes } = hardConstraintsFor(prefsA, prefsB);
  const history = await getCoupleHistory(coupleId, sessionId);

  const [round1Pool, round1Swipes] = await Promise.all([getTitlePool(sessionId, 1), getSwipes(sessionId, 1)]);
  const seenTitles = await getAllSeenTitles(sessionId);

  const likedKeys = new Set(round1Swipes.filter((s) => s.direction === "right").map((s) => `${s.mediaType}:${s.tmdbId}`));
  const likedByEither = round1Pool.filter((t) => likedKeys.has(`${t.mediaType}:${t.tmdbId}`));

  const brief = await refineSearchBrief({
    prefsA,
    prefsB,
    hardConstraints: hard,
    likedByBoth: [],
    likedByEither,
    seenTitles,
    history,
  });

  const excludeTmdbIds = new Set(seenTitles.map((t) => `${t.mediaType}:${t.tmdbId}`));

  const pool = await buildTitlePool({
    mediaTypes: mediaTypesFor(hard.contentType),
    movieGenres: brief.movieGenres,
    tvGenres: brief.tvGenres,
    excludeGenres: brief.excludeGenres,
    languageIsoCodes,
    yearFrom: brief.yearFrom,
    yearTo: brief.yearTo,
    minVoteAverage: brief.minVoteAverage,
    keywords: brief.keywords,
    sortBy: brief.sortBy,
    excludeTmdbIds,
    count: POOL_SIZE,
  });

  await saveBrief(sessionId, 2, brief);
  await saveTitlePool(sessionId, 2, pool);
  return pool;
}

export { POOL_SIZE };
