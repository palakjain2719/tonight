"use client";

import { useRef, useState } from "react";
import { SwipeCard, type SwipeCardHandle } from "@/components/SwipeCard";
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
  const topRef = useRef<SwipeCardHandle>(null);

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
          onSwipeComplete={handleComplete}
        />
      ))}

      <div className="absolute -bottom-24 left-0 right-0 flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label="Pass"
          onClick={() => topRef.current?.fly("left")}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-base-800 text-2xl text-white/70 shadow-lg transition-transform active:scale-90"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Like"
          onClick={() => topRef.current?.fly("right")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-500 text-2xl text-base-950 shadow-glow transition-transform active:scale-90"
        >
          ♥
        </button>
      </div>
    </div>
  );
}
