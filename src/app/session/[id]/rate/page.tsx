"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import type { Title } from "@/types";

export default function RatePage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<Title | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${id}/match`)
      .then((r) => r.json())
      .then((json) => setTitle(json.title || null))
      .catch(() => setTitle(null));
  }, [id]);

  async function submit() {
    if (!title || rating === 0) return;
    setSubmitting(true);
    try {
      await fetch(`/api/sessions/${id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: title.tmdbId, mediaType: title.mediaType, rating, notes: notes.trim() || undefined }),
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!title) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader label="Loading..." />
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl font-semibold">Saved.</p>
        <p className="mt-2 text-white/50">We'll use this to pick better next time.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold">How was {title.title}?</h1>
        <p className="mt-1 text-sm text-white/50">This helps us get your next movie night more right.</p>

        <div className="mt-6 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={`text-4xl transition-transform active:scale-90 ${n <= rating ? "text-ember-400" : "text-white/15"}`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you'd want to remember? (optional)"
          rows={3}
          maxLength={300}
          className="mt-6 w-full resize-none rounded-2xl border border-white/10 bg-base-800 px-4 py-3 text-sm text-left placeholder:text-white/30 focus:border-ember-500 focus:outline-none"
        />

        <div className="mt-6">
          <Button fullWidth disabled={rating === 0 || submitting} onClick={submit}>
            {submitting ? "Saving..." : "Save rating"}
          </Button>
        </div>
      </div>
    </main>
  );
}
