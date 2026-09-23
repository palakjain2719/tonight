import { GoogleGenerativeAI, SchemaType, FunctionCallingMode } from "@google/generative-ai";
import type { PreferenceInput, Title } from "@/types";
import { MOVIE_GENRES, TV_GENRES } from "@/lib/tmdb";
import { moodLabel, languageLabel, eraLabel } from "@/lib/preferences";

let cached: GoogleGenerativeAI | null = null;

function client(): GoogleGenerativeAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env.local.");
  }
  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

export interface SearchBrief {
  movieGenres: number[];
  tvGenres: number[];
  excludeGenres: number[];
  keywords: string[];
  yearFrom: number;
  yearTo: number;
  minVoteAverage: number;
  sortBy: "popularity.desc" | "vote_average.desc" | "release_date.desc";
  rationale: string;
}

export interface HardConstraints {
  yearFrom: number;
  yearTo: number;
  minVoteAverage: number;
  contentType: "movies" | "series";
}

export interface CoupleHistorySummary {
  lovedTitles: string[];
  mehTitles: string[];
}

const BRIEF_FUNCTION = {
  name: "submit_search_brief",
  description: "Submit the refined TMDB search brief for tonight's watch.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      movieGenres: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.NUMBER },
        description: "TMDB movie genre ids to include",
      },
      tvGenres: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.NUMBER },
        description: "TMDB tv genre ids to include",
      },
      excludeGenres: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.NUMBER },
        description: "TMDB genre ids (movie or tv) to actively avoid",
      },
      keywords: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Short plain-English keyword phrases capturing mood nuance",
      },
      yearFrom: { type: SchemaType.NUMBER },
      yearTo: { type: SchemaType.NUMBER },
      minVoteAverage: {
        type: SchemaType.NUMBER,
        description: "0-10 scale",
      },
      sortBy: {
        type: SchemaType.STRING,
        description: "One of: popularity.desc, vote_average.desc, release_date.desc",
      },
      rationale: {
        type: SchemaType.STRING,
        description: "One or two sentences on how you reconciled both partners' moods",
      },
    },
    required: [
      "movieGenres",
      "tvGenres",
      "excludeGenres",
      "keywords",
      "yearFrom",
      "yearTo",
      "minVoteAverage",
      "sortBy",
      "rationale",
    ],
  },
};

function describePreferences(label: string, prefs: PreferenceInput): string {
  return [
    `${label}:`,
    `  Moods: ${prefs.moods.map(moodLabel).join(", ") || "none selected"}`,
    prefs.moodText ? `  In their own words: "${prefs.moodText}"` : `  In their own words: (nothing written)`,
    `  Languages: ${prefs.languages.map(languageLabel).join(", ") || "none selected"}`,
    `  Content type: ${prefs.contentType}`,
    `  Minimum rating: ${prefs.minRating}+`,
    `  Era: ${prefs.eras.map(eraLabel).join(", ") || "none selected"}`,
  ].join("\n");
}

function genreTableText(): string {
  const movie = Object.entries(MOVIE_GENRES).map(([id, name]) => `${id}=${name}`).join(", ");
  const tv = Object.entries(TV_GENRES).map(([id, name]) => `${id}=${name}`).join(", ");
  return `Movie genre ids: ${movie}\nTV genre ids: ${tv}`;
}

function clamp(brief: SearchBrief, hard: HardConstraints): SearchBrief {
  return {
    ...brief,
    movieGenres: brief.movieGenres.filter((id) => id in MOVIE_GENRES),
    tvGenres: hard.contentType === "series" ? brief.tvGenres.filter((id) => id in TV_GENRES) : [],
    excludeGenres: brief.excludeGenres.filter((id) => id in MOVIE_GENRES || id in TV_GENRES),
    yearFrom: Math.max(hard.yearFrom, Math.min(brief.yearFrom || hard.yearFrom, hard.yearTo)),
    yearTo: Math.min(hard.yearTo, Math.max(brief.yearTo || hard.yearTo, hard.yearFrom)),
    minVoteAverage: Math.max(hard.minVoteAverage, Math.min(brief.minVoteAverage ?? hard.minVoteAverage, 10)),
    keywords: (brief.keywords || []).slice(0, 6),
  };
}

async function askGemini(prompt: string, hard: HardConstraints): Promise<SearchBrief> {
  const model = client().getGenerativeModel({
    model: "gemini-3.6-flash",
    tools: [{ functionDeclarations: [BRIEF_FUNCTION] }] as never,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY, allowedFunctionNames: ["submit_search_brief"] } },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts ?? [];

  const functionCall = parts.find((p) => p.functionCall);
  if (!functionCall?.functionCall) {
    throw new Error("Gemini did not return a search brief.");
  }

  const raw = functionCall.functionCall.args as unknown as SearchBrief;
  return clamp(raw, hard);
}

export async function generateSearchBrief(params: {
  prefsA: PreferenceInput;
  prefsB: PreferenceInput;
  hardConstraints: HardConstraints;
  history?: CoupleHistorySummary;
}): Promise<SearchBrief> {
  const { prefsA, prefsB, hardConstraints, history } = params;

  const historyText =
    history && (history.lovedTitles.length || history.mehTitles.length)
      ? [
          "",
          "This couple has watched together before. Use this to sharpen (not override) tonight's picks:",
          history.lovedTitles.length ? `  Loved (rated highly after watching): ${history.lovedTitles.join(", ")}` : "",
          history.mehTitles.length ? `  Liked on swipe but rated poorly after watching, or repeatedly failed to match on titles like: ${history.mehTitles.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const prompt = `You are helping a couple in India pick something to watch together tonight. Each partner filled out preferences independently, without seeing the other's answers. Read both profiles - including their free-text mood descriptions - and produce ONE reconciled TMDB search brief that gives both people a genuine shot at liking the result. Don't just average their tastes into something bland; look for a real overlap (e.g. a tense romantic thriller can satisfy someone who wants "intense" and someone who wants "romantic"). Weigh the free-text nuance heavily - it's the most specific signal either partner gave.

${describePreferences("Partner A", prefsA)}

${describePreferences("Partner B", prefsB)}
${historyText}

${genreTableText()}

Hard constraints you must stay within (already reconciled from both partners - do not widen them): content must be ${hardConstraints.contentType === "movies" ? "movies only" : "movies and/or series"}, release year between ${hardConstraints.yearFrom} and ${hardConstraints.yearTo}, minimum rating ${hardConstraints.minVoteAverage}+ out of 10.

Call submit_search_brief with your reconciled brief.`;

  return askGemini(prompt, hardConstraints);
}

export async function refineSearchBrief(params: {
  prefsA: PreferenceInput;
  prefsB: PreferenceInput;
  hardConstraints: HardConstraints;
  likedByBoth: Title[];
  likedByEither: Title[];
  seenTitles: Title[];
  history?: CoupleHistorySummary;
}): Promise<SearchBrief> {
  const { prefsA, prefsB, hardConstraints, likedByEither, seenTitles, history } = params;

  const historyText =
    history && (history.lovedTitles.length || history.mehTitles.length)
      ? `\nFrom past watch history - loved: ${history.lovedTitles.join(", ") || "none"}; didn't land: ${history.mehTitles.join(", ") || "none"}.`
      : "";

  const prompt = `A couple in India just swiped through 30 titles and didn't find a match, but their swipes reveal real signal about what's landing. Generate a SECOND, sharper TMDB search brief that leans into what they both actually responded to. Do not just repeat the first round's genres if their swipes point somewhere more specific.

${describePreferences("Partner A", prefsA)}

${describePreferences("Partner B", prefsB)}
${historyText}

Titles either partner swiped right on this round (lean into these patterns - genre, tone, era): ${
    likedByEither.length ? likedByEither.map((t) => `${t.title} (${t.genres.join("/")}, ${t.year})`).join("; ") : "none - both swiped left on everything, so be bolder and try a different angle than round one"
  }

Already shown this session - do not resurface these (the app will also hard-dedupe by TMDB id, this is just context): ${seenTitles
    .slice(0, 30)
    .map((t) => t.title)
    .join(", ")}

${genreTableText()}

Hard constraints (already reconciled - do not widen them): content must be ${hardConstraints.contentType === "movies" ? "movies only" : "movies and/or series"}, release year between ${hardConstraints.yearFrom} and ${hardConstraints.yearTo}, minimum rating ${hardConstraints.minVoteAverage}+ out of 10.

Call submit_search_brief with your sharpened brief.`;

  return askGemini(prompt, hardConstraints);
}
