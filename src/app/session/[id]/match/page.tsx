"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { BackButton } from "@/components/BackButton";
import { Loader } from "@/components/Loader";
import { PlatformBadge } from "@/components/PlatformBadge";
import type { StreamingLink, Title } from "@/types";

const CONFETTI_COLORS = ["#b5411a", "#c4953a", "#f6f0e8", "#d4854a", "#8a6914", "#e8c084", "#4a7c59", "#d2c9bb"];

interface ConfettiPiece {
  id: number;
  color: string;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rot: number;
  width: number;
  height: number;
  radius: number;
}

function Confetti() {
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 2.2 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 140,
        rot: (Math.random() - 0.5) * 720,
        width: 6 + Math.random() * 8,
        height: 10 + Math.random() * 12,
        radius: Math.random() > 0.6 ? 50 : 2,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-10">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 confetti-piece"
          style={{
            background: p.color,
            left: `${p.left}%`,
            width: `${p.width}px`,
            height: `${p.height}px`,
            borderRadius: `${p.radius}%`,
            "--delay": `${p.delay}s`,
            "--dur": `${p.duration}s`,
            "--drift": `${p.drift}px`,
            "--rot": `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState<Title | null>(null);
  const [platforms, setPlatforms] = useState<StreamingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animating, setAnimating] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!cancelled) setError("Couldn’t load your match — try refreshing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!loading && !error && title) {
      timerRef.current = setTimeout(() => setAnimating(false), 3200);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading, error, title]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader label="Pulling up where to watch it..." />
      </main>
    );
  }

  if (error || !title) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 text-center text-muted">
        {error || "No match found."}
      </main>
    );
  }

  return (
    <main className="flex-1 relative overflow-hidden">
      <AnimatePresence>
        {animating && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-20 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            style={{ background: "linear-gradient(160deg, #1c1510 0%, #2d1a0e 100%)" }}
          >
            <Confetti />

            <motion.div
              className="relative z-30 text-center px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.p
                className="font-display text-xs font-semibold uppercase tracking-[0.35em] text-amber-400 mb-3"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                Tonight&apos;s pick
              </motion.p>

              <motion.h1
                className="font-display text-5xl font-bold text-white leading-none"
                initial={{ scale: 1.7, rotate: -6, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  delay: 0.3,
                  type: "spring",
                  stiffness: 420,
                  damping: 22,
                }}
                style={{ textShadow: "0 2px 32px rgba(196, 149, 58, 0.6)" }}
              >
                IT&rsquo;S A
                <br />
                <span className="text-amber-400 italic">MATCH</span>
              </motion.h1>

              <motion.div
                className="mt-8 mx-auto w-44 aspect-[2/3] overflow-hidden rounded-2xl shadow-lift"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.55,
                  type: "spring",
                  stiffness: 320,
                  damping: 20,
                }}
              >
                {title.posterPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={title.posterPath} alt={title.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-base-800 text-white/30 text-sm p-4 text-center">
                    {title.title}
                  </div>
                )}
              </motion.div>

              <motion.p
                className="mt-4 font-display text-xl font-semibold text-white"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.4 }}
              >
                {title.title}
              </motion.p>
            </motion.div>

            <motion.button
              className="absolute bottom-10 left-0 right-0 text-center text-sm text-white/50 hover:text-white/80 transition-colors z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              onClick={() => setAnimating(false)}
            >
              Skip →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-6 py-10">
        <div className="mx-auto mb-4 w-full max-w-sm">
          <BackButton href="/" />
        </div>
        <div className="mx-auto w-full max-w-sm animate-pop-in text-center">
          <p className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.2em] text-ember-500">It&apos;s a match</p>

          <div className="mx-auto mb-6 aspect-[2/3] w-48 overflow-hidden rounded-2xl shadow-lift border border-base-700">
            {title.posterPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={title.posterPath} alt={title.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-base-900 text-muted">{title.title}</div>
            )}
          </div>

          <h1 className="font-display text-3xl font-semibold leading-tight text-ink">{title.title}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
            {title.year && <span>{title.year}</span>}
            {title.imdbRating && <span className="text-ember-500">★ {title.imdbRating.toFixed(1)}</span>}
            {title.runtime && <span>{title.runtime} min</span>}
            {title.mediaType === "tv" && <span>Series</span>}
          </div>
          {title.overview && <p className="mt-3 text-sm text-muted">{title.overview}</p>}

          <div className="mt-8 text-left">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-faint">Watch it now on</p>
            {platforms.length > 0 ? (
              <div className="flex flex-col gap-2">
                {platforms.map((p) => (
                  <PlatformBadge key={p.serviceId} platform={p} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted">
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
      </div>
    </main>
  );
}
