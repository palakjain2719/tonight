import type { Era, Language, PreferenceInput } from "@/types";
import { LANGUAGE_ISO } from "@/lib/tmdb";

const CURRENT_YEAR = new Date().getFullYear();

const ERA_RANGES: Record<Exclude<Era, "any">, [number, number]> = {
  classic: [1950, 1999],
  "2000-2020": [2000, 2020],
  recent: [2021, CURRENT_YEAR],
};

/** Union of both partners' era selections. "Any" (by either partner) removes the constraint entirely. */
export function mergeEraRange(erasA: Era[], erasB: Era[]): { yearFrom: number; yearTo: number } {
  const combined = [...erasA, ...erasB];
  if (combined.length === 0 || combined.includes("any")) {
    return { yearFrom: 1950, yearTo: CURRENT_YEAR };
  }
  let from = CURRENT_YEAR;
  let to = 1950;
  for (const era of combined) {
    if (era === "any") continue;
    const [f, t] = ERA_RANGES[era];
    from = Math.min(from, f);
    to = Math.max(to, t);
  }
  return { yearFrom: from, yearTo: to };
}

/** Union of both partners' language selections. "Any" removes the constraint entirely. */
export function mergeLanguages(langsA: Language[], langsB: Language[]): string[] {
  const combined = [...langsA, ...langsB];
  if (combined.length === 0 || combined.includes("any")) return [];
  const iso = new Set<string>();
  for (const lang of combined) {
    if (lang === "any") continue;
    const code = LANGUAGE_ISO[lang];
    if (code) iso.add(code);
  }
  return Array.from(iso);
}

/** The stricter (higher) rating floor satisfies both partners. */
export function mergeMinRating(a: number, b: number): number {
  return Math.max(a, b);
}

/** "Movies only" from either partner is a hard constraint; series only survive if both allow them. */
export function mergeContentType(a: PreferenceInput["contentType"], b: PreferenceInput["contentType"]): "movies" | "series" {
  return a === "movies" || b === "movies" ? "movies" : "series";
}

export function moodLabel(mood: string): string {
  const labels: Record<string, string> = {
    light: "Light & fun",
    intense: "Intense & gripping",
    scary: "Scary",
    romantic: "Romantic",
    other: "Other",
  };
  return labels[mood] ?? mood;
}

export function languageLabel(lang: string): string {
  const labels: Record<string, string> = {
    hindi: "Hindi",
    english: "English",
    tamil: "Tamil",
    telugu: "Telugu",
    kannada: "Kannada",
    any: "Any",
  };
  return labels[lang] ?? lang;
}

export function eraLabel(era: string): string {
  const labels: Record<string, string> = {
    any: "Any",
    classic: "Classic (pre-2000)",
    "2000-2020": "2000-2020",
    recent: "Recent (2021-2026)",
  };
  return labels[era] ?? era;
}
