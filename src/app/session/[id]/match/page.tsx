"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { PlatformBadge } from "@/components/PlatformBadge";
import type { StreamingLink, Title } from "@/types";

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState<Title | null>(null);
  const [platforms, setPlatforms] = useState<StreamingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(`/api/sessions/${id}/match`, { cache: "no-store" });
        if (!res.ok) throw new Error("no match");
        const json = await res.json();
        if (!cancelled) {
          setTitle(json.title);
          setPlatforms(json.platforms || []);
        }
      } catch {
        if (!cancelled) setError("Couldn't load your match — try refreshing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader label="Pulling up where to watch it..." />
      </main>
    );
  }

  if (error || !title) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 text-center text-white/60">{error || "No match found."}</main>
    );
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto w-full max-w-sm animate-pop-in text-center">
        <p className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.2em] text-ember-400">It's a match</p>

        <div className="mx-auto mb-6 aspect-[2/3] w-48 overflow-hidden rounded-2xl shadow-glow">
          {title.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={title.posterPath} alt={title.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-base-800 text-white/30">{title.title}</div>
          )}
        </div>

        <h1 className="font-display text-3xl font-semibold leading-tight">{title.title}</h1>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-white/60">
          {title.year && <span>{title.year}</span>}
          {title.imdbRating && <span className="text-ember-400">★ {title.imdbRating.toFixed(1)}</span>}
          {title.runtime && <span>{title.runtime} min</span>}
          {title.mediaType === "tv" && <span>Series</span>}
        </div>
        {title.overview && <p className="mt-3 text-sm text-white/50">{title.overview}</p>}

        <div className="mt-8 text-left">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-white/40">Watch it now on</p>
          {platforms.length > 0 ? (
            <div className="flex flex-col gap-2">
              {platforms.map((p) => (
                <PlatformBadge key={p.serviceId} platform={p} />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-white/40">
              Not currently streaming in India on a platform we track — worth a quick search before you settle in.
            </p>
          )}
        </div>

        <div className="mt-8">
          <Button fullWidth variant="secondary" onClick={() => router.push(`/session/${id}/rate`)}>
            We watched it — rate it
          </Button>
        </div>
      </div>
    </main>
  );
}
