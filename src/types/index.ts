export type PartnerRole = "a" | "b";

export type Mood = "light" | "intense" | "scary" | "romantic" | "other";

export type Language = "hindi" | "english" | "tamil" | "telugu" | "kannada" | "any";

export type ContentType = "movies" | "series";

export type MinRating = 6 | 7 | 8 | 9;

export type Era = "any" | "classic" | "2000-2020" | "recent";

export type SessionStatus =
  | "awaiting_b"
  | "generating"
  | "swiping"
  | "matched"
  | "final_choice"
  | "completed";

export type MediaType = "movie" | "tv";

export interface PreferenceInput {
  moods: Mood[];
  moodText: string;
  languages: Language[];
  contentType: ContentType;
  minRating: MinRating;
  eras: Era[];
}

export interface SessionSummary {
  id: string;
  status: SessionStatus;
  round: number;
  hasA: boolean;
  hasB: boolean;
}

export interface Title {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview: string;
  runtime: number | null;
  imdbRating: number | null;
  genres: string[];
}

export interface StreamingLink {
  serviceId: string;
  serviceName: string;
  type: "free" | "subscription" | "buy" | "rent" | "addon";
  link: string;
  quality: string | null;
}

export type SwipeDirection = "left" | "right";

export interface SwipeRecord {
  tmdbId: number;
  mediaType: MediaType;
  direction: SwipeDirection;
}
