"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SwipeDeck } from "@/components/SwipeDeck";
import { BackButton } from "@/components/BackButton";
import { Loader } from "@/components/Loader";
import { getRole, pathForStatus } from "@/lib/clientSession";
import { useSessionStatus } from "@/lib/useSessionStatus";
import type { SwipeDirection, Title } from "@/types";

export default function SwipePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useSessionStatus(id);

  const [role, setRole] = useState<"a" | "b" | null>(null);
  const [loadedRound, setLoadedRound] = useState<number | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [swiped, setSwiped] = useState(0);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = getRole(id);
    if (!r) {
      router.replace("/");
      return;
    }
    setRole(r);
  }, [id, router]);

  const loadPool = useCallback(
    async (round: number, partner: "a" | "b") => {
      setLoading(true);
      setWaitingForPartner(false);
      setSwiped(0);
      try {
        const res = await fetch(`/api/sessions/${id}/pool?partner=${partner}&round=${round}`, { cache: "no-store" });
        const json = await res.json();
        setTitles(json.titles || []);
        setLoadedRound(round);
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!role || !data) return;
    if (data.status === "matched" || data.status === "final_choice" || data.status === "completed") {
      router.replace(pathForStatus(id, data.status));
      return;
    }
    if (data.status === "swiping" && data.round !== loadedRound) {
      loadPool(data.round, role);
    }
  }, [role, data, loadedRound, id, router, loadPool]);

  async function handleDecision(title: Title, direction: SwipeDirection) {
    if (!role || loadedRound === null) return;
    setSwiped((s) => s + 1);
    try {
      const res = await fetch(`/api/sessions/${id}/swipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner: role, round: loadedRound, tmdbId: title.tmdbId, mediaType: title.mediaType, direction }),
      });
      const json = await res.json();
      if (json.isNewMatch) {
        router.push(`/session/${id}/match`);
      }
    } catch {
      // Swipe is best-effort
    }
  }

  if (!role || loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <Loader label="Loading tonight's picks..." />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-6 pb-28 pt-6">
      <div className="mx-auto mb-4 w-full max-w-sm">
        <BackButton />
      </div>
      <div className="mx-auto mb-6 w-full max-w-sm">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Round {loadedRound}</span>
          <span>
            {Math.min(swiped, titles.length)} / {titles.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-base-700">
          <div
            className="h-full rounded-full bg-ember-500 transition-all"
            style={{ width: `${titles.length ? (Math.min(swiped, titles.length) / titles.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {waitingForPartner ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="font-display text-xl font-semibold text-ink">Nicely done.</p>
            <Loader label="Waiting for your partner to finish swiping..." />
          </div>
        </div>
      ) : (
        <SwipeDeck titles={titles} onDecision={handleDecision} onDeckEmpty={() => setWaitingForPartner(true)} />
      )}
    </main>
  );
}
