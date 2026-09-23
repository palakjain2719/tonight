"use client";

import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import type { Title } from "@/types";

export type InfoStage = 0 | 1 | 2; // 0 = poster, 1 = summary, 2 = trailer

export interface SwipeCardHandle {
  fly: (direction: "left" | "right") => void;
}

interface Props {
  title: Title;
  active: boolean;
  stackIndex: number;
  infoStage: InfoStage;
  onStageChange: (stage: InfoStage) => void;
  onSwipeComplete: (direction: "left" | "right") => void;
}

const VERTICAL_THRESHOLD_PX = 60;
const VERTICAL_VELOCITY_THRESHOLD = 350;

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function loopStage(stage: InfoStage, dir: 1 | -1): InfoStage {
  return (((stage + dir) % 3) + 3) % 3 as InfoStage;
}

const stageVariants = {
  enter: (dir: 1 | -1) => ({ y: dir === 1 ? 30 : -30, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ y: dir === 1 ? -30 : 30, opacity: 0 }),
};

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { title, active, stackIndex, infoStage, onStageChange, onSwipeComplete },
  ref
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);

  const [hasTicked, setHasTicked] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null | undefined>(undefined);

  // Track direction of stage change for slide animation
  const prevStageRef = useRef(infoStage);
  const [stageDir, setStageDir] = useState<1 | -1>(1);
  useEffect(() => {
    if (infoStage !== prevStageRef.current) {
      const diff = (infoStage - prevStageRef.current + 3) % 3;
      setStageDir(diff === 1 ? 1 : -1);
      prevStageRef.current = infoStage;
    }
  }, [infoStage]);

  // Lazy-fetch trailer only when stage 2 is first entered
  useEffect(() => {
    if (infoStage === 2 && trailerKey === undefined) {
      fetch(`/api/titles/${title.tmdbId}/trailer?mediaType=${title.mediaType}`)
        .then((r) => r.json())
        .then((data: { key: string } | null) => setTrailerKey(data?.key ?? null))
        .catch(() => setTrailerKey(null));
    }
  }, [infoStage, trailerKey, title.tmdbId, title.mediaType]);

  function fly(direction: "left" | "right") {
    animate(x, direction === "right" ? 700 : -700, { duration: 0.28, ease: "easeIn" }).then(() =>
      onSwipeComplete(direction)
    );
  }

  function snapBack() {
    animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
  }

  useImperativeHandle(ref, () => ({ fly }));

  function handleDrag(_: unknown, info: { offset: { x: number; y: number } }) {
    const crossed = Math.abs(info.offset.x) > 120 || Math.abs(info.offset.y) > VERTICAL_THRESHOLD_PX;
    if (crossed && !hasTicked) {
      vibrate(10);
      setHasTicked(true);
    } else if (!crossed && hasTicked) {
      setHasTicked(false);
    }
  }

  function handleDragEnd(
    _: unknown,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) {
    const horizontalWins = Math.abs(info.offset.x) >= Math.abs(info.offset.y);

    if (horizontalWins) {
      const committed = Math.abs(info.offset.x) > 120 || Math.abs(info.velocity.x) > 550;
      if (!committed) { snapBack(); return; }
      fly(info.offset.x > 0 ? "right" : "left");
      return;
    }

    // Vertical gesture — change stage
    const committed =
      Math.abs(info.offset.y) > VERTICAL_THRESHOLD_PX ||
      Math.abs(info.velocity.y) > VERTICAL_VELOCITY_THRESHOLD;
    if (committed) {
      vibrate(10);
      onStageChange(loopStage(infoStage, info.offset.y < 0 ? 1 : -1));
    }
    snapBack();
  }

  const runtimeLabel = title.runtime
    ? `${title.runtime} min`
    : title.mediaType === "tv"
    ? "Series"
    : null;

  return (
    <motion.div
      className="absolute inset-0 swipe-surface select-none"
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : 0,
        zIndex: 50 - stackIndex,
      }}
      animate={
        !active
          ? { scale: 1 - stackIndex * 0.045, top: stackIndex * 12, opacity: stackIndex > 2 ? 0 : 1 }
          : undefined
      }
      initial={false}
      drag={active ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDrag={active ? handleDrag : undefined}
      onDragEnd={active ? handleDragEnd : undefined}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-base-700 shadow-lift">
        <AnimatePresence mode="popLayout" custom={stageDir} initial={false}>
          <motion.div
            key={infoStage}
            custom={stageDir}
            variants={stageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Stage 0: Poster */}
            {infoStage === 0 && (
              <div className="relative h-full w-full bg-base-900">
                {title.posterPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={title.posterPath}
                    alt={title.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-faint">
                    <span className="font-display text-lg italic">{title.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(28,21,16,0.92)] via-[rgba(28,21,16,0.15)] to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display text-2xl font-semibold leading-tight text-white">
                    {title.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-white/75">
                    {title.year && <span>{title.year}</span>}
                    {title.imdbRating && (
                      <span className="flex items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300">
                        ★ {title.imdbRating.toFixed(1)}
                      </span>
                    )}
                    {runtimeLabel && <span>{runtimeLabel}</span>}
                    {title.mediaType === "tv" && (
                      <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">Series</span>
                    )}
                  </div>
                  {title.overview && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/65">{title.overview}</p>
                  )}
                  {active && (
                    <p className="mt-3 text-[10px] text-white/35">
                      Swipe up for plot · down for trailer
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stage 1: Summary */}
            {infoStage === 1 && (
              <div className="flex h-full flex-col bg-parchment">
                {title.posterPath && (
                  <div className="relative h-36 shrink-0 overflow-hidden bg-base-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={title.posterPath}
                      alt={title.title}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-parchment" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                  <h3 className="font-display text-xl font-semibold leading-tight text-ink">
                    {title.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    {title.year && <span>{title.year}</span>}
                    {title.imdbRating && <span>★ {title.imdbRating.toFixed(1)}</span>}
                    {runtimeLabel && <span>{runtimeLabel}</span>}
                    {title.genres.length > 0 && <span>{title.genres.join(" · ")}</span>}
                  </div>
                  <p className="text-sm leading-relaxed text-ink/80">
                    {title.overview ||
                      "No summary available — guess you'll have to find out."}
                  </p>
                  {active && (
                    <p className="mt-auto pt-4 text-center text-[10px] text-faint">
                      Swipe up for trailer · down for poster
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stage 2: Trailer */}
            {infoStage === 2 && (
              <div className="flex h-full flex-col bg-black">
                <div className="flex shrink-0 items-center px-4 py-3">
                  <span className="text-sm font-medium text-white/70">{title.title}</span>
                </div>
                <div className="relative flex-1">
                  {trailerKey === undefined && (
                    <div className="flex h-full items-center justify-center text-sm text-white/40">
                      Finding trailer…
                    </div>
                  )}
                  {trailerKey === null && (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                      <span className="text-3xl">🎬</span>
                      <p className="text-sm text-white/50">
                        No trailer on YouTube for this one.
                      </p>
                    </div>
                  )}
                  {trailerKey && (
                    <>
                      <iframe
                        className="absolute inset-0 h-full w-full"
                        src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&playsinline=1`}
                        title={`${title.title} trailer`}
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      {/* overlay blocks touch-drag from landing inside the iframe */}
                      <div className="absolute inset-0" style={{ touchAction: "none" }} />
                    </>
                  )}
                </div>
                {trailerKey && (
                  <a
                    href={`https://www.youtube.com/watch?v=${trailerKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-3 text-center text-xs text-white/35 hover:text-white/60 transition-colors"
                  >
                    Open in YouTube for sound ↗
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* LIKE / PASS overlays — poster stage only */}
        {active && infoStage === 0 && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute right-6 top-6 rotate-12 rounded-lg border-[3px] border-mint-500 px-3 py-1 font-display text-xl font-bold text-mint-500"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="absolute left-6 top-6 -rotate-12 rounded-lg border-[3px] border-white/80 px-3 py-1 font-display text-xl font-bold text-white/80"
            >
              PASS
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
});
