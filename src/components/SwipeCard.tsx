"use client";

import { forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Title } from "@/types";

export interface SwipeCardHandle {
  fly: (direction: "left" | "right") => void;
}

interface Props {
  title: Title;
  active: boolean;
  stackIndex: number;
  onSwipeComplete: (direction: "left" | "right") => void;
}

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard(
  { title, active, stackIndex, onSwipeComplete },
  ref
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);

  function fly(direction: "left" | "right") {
    animate(x, direction === "right" ? 700 : -700, { duration: 0.28, ease: "easeIn" }).then(() => onSwipeComplete(direction));
  }

  function snapBack() {
    animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
  }

  useImperativeHandle(ref, () => ({ fly }));

  const runtimeLabel = title.runtime ? `${title.runtime} min` : title.mediaType === "tv" ? "Series" : null;

  return (
    <motion.div
      className="absolute inset-0 swipe-surface select-none"
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : 0,
        zIndex: 50 - stackIndex,
      }}
      animate={!active ? { scale: 1 - stackIndex * 0.045, top: stackIndex * 12, opacity: stackIndex > 2 ? 0 : 1 } : undefined}
      initial={false}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120 || info.velocity.x > 550) fly("right");
        else if (info.offset.x < -120 || info.velocity.x < -550) fly("left");
        else snapBack();
      }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-base-800 shadow-2xl">
        <div className="relative flex-1 bg-base-700">
          {title.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={title.posterPath} alt={title.title} className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/20">
              <span className="font-display text-lg">{title.title}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/20 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-2xl font-semibold leading-tight">{title.title}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-white/70">
            {title.year && <span>{title.year}</span>}
            {title.imdbRating && (
              <span className="flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-semibold text-ember-400">
                ★ {title.imdbRating.toFixed(1)}
              </span>
            )}
            {runtimeLabel && <span>{runtimeLabel}</span>}
            {title.mediaType === "tv" && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs">Series</span>}
          </div>
          {title.overview && <p className="mt-2 line-clamp-1 text-sm text-white/60">{title.overview}</p>}
        </div>

        {active && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute right-6 top-6 rotate-12 rounded-lg border-[3px] border-mint-500 px-3 py-1 font-display text-xl font-bold text-mint-500"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="absolute left-6 top-6 -rotate-12 rounded-lg border-[3px] border-white/70 px-3 py-1 font-display text-xl font-bold text-white/70"
            >
              PASS
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
});
