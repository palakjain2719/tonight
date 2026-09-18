"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import type { SessionStatus } from "@/types";

export interface SessionStatusData {
  id: string;
  status: SessionStatus;
  round: number;
  hasA: boolean;
  hasB: boolean;
}

/**
 * Polls session status and layers a Realtime broadcast subscription on top
 * so both partners' screens react the instant something changes, without
 * relying on the poll interval alone.
 */
export function useSessionStatus(sessionId: string, pollMs = 3000) {
  const [data, setData] = useState<SessionStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Couldn't reach the session. Retrying...");
      }
    }

    poll();
    const interval = setInterval(poll, pollMs);

    const EVENTS = [
      "partner_joined",
      "preferences_ready",
      "pool_ready",
      "partner_finished_swiping",
      "match_found",
      "round_advanced",
      "final_choice_ready",
    ];

    let channel: ReturnType<ReturnType<typeof getBrowserClient>["channel"]> | null = null;
    try {
      const client = getBrowserClient();
      channel = client.channel(`session:${sessionId}`);
      for (const event of EVENTS) {
        channel.on("broadcast", { event }, () => poll());
      }
      channel.subscribe();
    } catch {
      // Realtime is optional — polling still covers us.
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) {
        try {
          getBrowserClient().removeChannel(channel);
        } catch {
          /* noop */
        }
      }
    };
  }, [sessionId, pollMs]);

  return { data, error };
}
