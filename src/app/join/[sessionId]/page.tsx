"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRole, pathForStatus, setRole } from "@/lib/clientSession";

export default function JoinPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError("This link isn't valid — ask your partner to send a fresh one.");
          return;
        }
        const session = await res.json();
        if (cancelled) return;

        const existingRole = getRole(sessionId);
        if (existingRole === "a" || (existingRole === "b" && session.hasB)) {
          router.replace(existingRole === "b" ? pathForStatus(sessionId, session.status) : `/session/${sessionId}/preferences`);
          return;
        }

        if (existingRole !== "b" && session.hasB) {
          setError("This movie night already has two people in it.");
          return;
        }

        setRole(sessionId, "b");
        router.replace(`/session/${sessionId}/preferences`);
      } catch {
        if (!cancelled) setError("Couldn't reach the session — check your connection and try again.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {error ? (
        <div className="max-w-sm">
          <p className="font-display text-xl font-semibold">Hmm.</p>
          <p className="mt-2 text-white/60">{error}</p>
        </div>
      ) : (
        <p className="text-white/50">Joining movie night...</p>
      )}
    </main>
  );
}
