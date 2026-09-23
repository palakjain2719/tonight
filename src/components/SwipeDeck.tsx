"use client";

import { useEffect, useRef, useState } from "react";
import { SwipeCard, type InfoStage, type SwipeCardHandle } from "@/components/SwipeCard";
import type { SwipeDirection, Title } from "@/types";

export function SwipeDeck({
  titles,
  onDecision,
  onDeckEmpty,
}: {
  titles: Title[];
  onDecision: (title: Title, direction: SwipeDirection) => void;
  onDeckEmpty: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [infoStage, setInfoStage] = useState<InfoStage>(0);
  const topRef = useRef<SwipeCardHandle>(null);

  // Reset to poster view each time a new card becomes top
  useEffect(() => {
    setInfoStage(0);
  }, [index]);

  const visible = titles.slice(index, index + 3);

  function handleComplete(direction: SwipeDirection) {
    const title = titles[index];
    if (title) onDecision(title, direction);
    const next = index + 1;
    setIndex(next);
    if (next >= titles.length) onDeckEmpty();
  }

  if (visible.length === 0) return null;

  return (
    <div className="relative mx-auto h-[68vh] max-h-[560px] w-full max-w-sm">
      {visible.map((title, i) => (
        <SwipeCard
          key={`${title.mediaType}:${title.tmdbId}`}
          ref={i === 0 ? topRef : undefined}
          title={title}
          active={i === 0}
          stackIndex={i}
          infoStage={i === 0 ? infoStage : 0}
          onStageChange={setInfoStage}
          onSwipeComplete={handleComplete}
        />
      ))}

      {/* Controls */}
      <div className="absolute -bottom-24 left-0 right-0 flex items-center justify-center gap-4">
        {/* Summary toggle */}
        <button
          type="button"
          aria-label="Show summary"
          aria-pressed={infoStage === 1}
          onClick={() => setInfoStage((s) => (s === 1 ? 0 : 1))}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-base-700 bg-white text-sm shadow-card transition-all hover:border-ember-500/40 active:scale-90"
          style={
            infoStage === 1
              ? { borderColor: "rgb(var(--color-ember-500) / 0.6)", color: "rgb(181 65 26)" }
              : {}
          }
        >
          ℹ
        </button>

        {/* Pass */}
        <button
          type="button"
          aria-label="Pass"
          onClick={() => topRef.current?.fly("left")}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-base-700 bg-white text-2xl text-muted shadow-card transition-transform hover:border-ember-500/40 hover:text-ember-500 active:scale-90"
        >
          ✕
        </button>

        {/* Like */}
        <button
          type="button"
          aria-label="Like"
          onClick={() => topRef.current?.fly("right")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-500 text-2xl text-white shadow-glow transition-transform active:scale-90"
        >
          ♥
        </button>

        {/* Trailer toggle */}
        <button
          type="button"
          aria-label="Show trailer"
          aria-pressed={infoStage === 2}
          onClick={() => setInfoStage((s) => (s === 2 ? 0 : 2))}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-base-700 bg-white text-sm shadow-card transition-all hover:border-ember-500/40 active:scale-90"
          style={
            infoStage === 2
              ? { borderColor: "rgb(var(--color-ember-500) / 0.6)", color: "rgb(181 65 26)" }
              : {}
          }
        >
          ▶
        </button>
      </div>
    </div>
  );
}
