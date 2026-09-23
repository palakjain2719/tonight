"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader } from "@/components/Loader";
import { PlatformBadge } from "@/components/PlatformBadge";
import type { StreamingLink, Title } from "@/types";

interface RankedTitle {
  title: Title;
  score: number;
}

function TopFiveItem({ ranked }: { ranked: RankedTitle }) {
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<StreamingLink[] | null>(null);
  const { title, score } = ranked;

  async function toggle() {
    setOpen((o) => !o);
    if (!open && platforms === null) {
      try {
        const res = await fetch(`/api/titles/${title.tmdbId}/availability?mediaType=${title.mediaType}`);
        const json = await res.json();
        setPlatforms(json.platforms || []);
      } catch {
        setPlatforms([]);
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-base-700 bg-white shadow-card">
      <button type="button" onClick={toggle} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-base-900">
          {title.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={title.posterPath} alt={title.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-ink">{title.title}</p>
          <p className="text-xs text-muted">
            {title.year} {title.imdbRating ? `· ★ ${title.imdbRating.toFixed(1)}` : ""}
          </p>
          <p className="mt-1 text-xs font-medium text-ember-500">
            {score >= 2 ? "You both liked this" : "One of you liked this"}
          </p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 flex-shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-base-700 p-3">
          {title.overview && <p className="mb-3 text-sm text-muted">{title.overview}</p>}
          {platforms === null ? (
            <Loader label="Checking where to watch..." />
          ) : platforms.length > 0 ? (
            <div className="flex flex-col gap-2">
              {platforms.map((p) => (
                <PlatformBadge key={p.serviceId} platform={p} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-faint">Not currently streaming in India on a platform we track.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FinalPage() {
  const { id } = useParams<{ id: string }>();
  const [ranked, setRanked] = useState<RankedTitle[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${id}/final`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setRanked(json.topFive || []);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ember-500">No match yet</p>
        <h1 className="font-display text-2xl font-semibold text-ink">You two are close. Pick together.</h1>
        <p className="mt-1 text-sm text-muted">Here&apos;s what got the most love across both rounds — decide as a team.</p>

        <div className="mt-6 flex flex-col gap-3">
          {ranked === null ? (
            <Loader label="Tallying swipes..." />
          ) : ranked.length === 0 ? (
            <p className="text-center text-sm text-muted">Neither of you swiped right on anything — time to just pick something new together.</p>
          ) : (
            ranked.map((r) => <TopFiveItem key={`${r.title.mediaType}:${r.title.tmdbId}`} ranked={r} />)
          )}
        </div>
      </div>
    </main>
  );
}
