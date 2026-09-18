"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import type { ContentType, Era, Language, MinRating, Mood, PreferenceInput } from "@/types";

const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: "light", label: "Light & fun", emoji: "😄" },
  { value: "intense", label: "Intense & gripping", emoji: "🔥" },
  { value: "scary", label: "Scary", emoji: "👻" },
  { value: "romantic", label: "Romantic", emoji: "💛" },
  { value: "other", label: "Other", emoji: "✨" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
  { value: "any", label: "Any" },
];

const RATINGS: MinRating[] = [6, 7, 8, 9];

const ERAS: { value: Era; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "classic", label: "Classic (pre-2000)" },
  { value: "2000-2020", label: "2000–2020" },
  { value: "recent", label: "Recent (2021–2026)" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
        active ? "border-ember-500 bg-ember-500/15 text-ember-400" : "border-white/10 bg-base-800 text-white/70 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-white/45">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PreferenceForm({
  onSubmit,
  submitting,
  submitLabel = "Continue",
}: {
  onSubmit: (prefs: PreferenceInput) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [moodText, setMoodText] = useState("");
  const [languages, setLanguages] = useState<Language[]>([]);
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [minRating, setMinRating] = useState<MinRating | null>(null);
  const [eras, setEras] = useState<Era[]>([]);

  function toggleMood(m: Mood) {
    setMoods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function toggleLanguage(l: Language) {
    setLanguages((prev) => {
      if (l === "any") return prev.includes("any") ? [] : ["any"];
      const withoutAny = prev.filter((x) => x !== "any");
      return withoutAny.includes(l) ? withoutAny.filter((x) => x !== l) : [...withoutAny, l];
    });
  }

  function toggleEra(e: Era) {
    setEras((prev) => {
      if (e === "any") return prev.includes("any") ? [] : ["any"];
      const withoutAny = prev.filter((x) => x !== "any");
      return withoutAny.includes(e) ? withoutAny.filter((x) => x !== e) : [...withoutAny, e];
    });
  }

  const canSubmit = useMemo(
    () => moods.length > 0 && languages.length > 0 && !!contentType && !!minRating && eras.length > 0,
    [moods, languages, contentType, minRating, eras]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        onSubmit({ moods, moodText: moodText.trim(), languages, contentType: contentType!, minRating: minRating!, eras });
      }}
      className="flex flex-col gap-8"
    >
      <Section title="What's the mood tonight?" hint="Pick as many as fit.">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip key={m.value} active={moods.includes(m.value)} onClick={() => toggleMood(m.value)}>
              {m.emoji} {m.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Describe it, if you want" hint="Optional — the more specific, the better we can match you two.">
        <textarea
          value={moodText}
          onChange={(e) => setMoodText(e.target.value)}
          placeholder='e.g. "something slow-burn with a twist, not too dark"'
          rows={3}
          maxLength={400}
          className="w-full resize-none rounded-2xl border border-white/10 bg-base-800 px-4 py-3 text-sm placeholder:text-white/30 focus:border-ember-500 focus:outline-none"
        />
      </Section>

      <Section title="Language">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Chip key={l.value} active={languages.includes(l.value)} onClick={() => toggleLanguage(l.value)}>
              {l.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Movies or series?">
        <div className="flex gap-2">
          <Chip active={contentType === "movies"} onClick={() => setContentType("movies")}>
            Movies only
          </Chip>
          <Chip active={contentType === "series"} onClick={() => setContentType("series")}>
            Include series
          </Chip>
        </div>
      </Section>

      <Section title="Minimum rating">
        <div className="flex flex-wrap items-center gap-2">
          {RATINGS.map((r) => (
            <div key={r} className="flex items-center gap-1.5">
              <Chip active={minRating === r} onClick={() => setMinRating(r)}>
                {r}+
              </Chip>
              {r === 9 && <span className="text-xs text-white/35">very few titles</span>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Era">
        <div className="flex flex-wrap gap-2">
          {ERAS.map((e) => (
            <Chip key={e.value} active={eras.includes(e.value)} onClick={() => toggleEra(e.value)}>
              {e.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Button type="submit" disabled={!canSubmit || submitting} fullWidth>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
