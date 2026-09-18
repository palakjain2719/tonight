"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { getCoupleId, setCoupleId, setRole } from "@/lib/clientSession";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupleId: getCoupleId() }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setCoupleId(data.coupleId);
      setRole(data.sessionId, "a");
      router.push(`/session/${data.sessionId}/preferences`);
    } catch {
      setError("Couldn't start a session — check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ember-500 to-ember-600 shadow-glow">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-base-950">
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" fill="currentColor" opacity="0.15" />
            <path d="M9.5 9 15 12l-5.5 3V9Z" fill="currentColor" />
          </svg>
        </div>

        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
          Stop scrolling.
          <br />
          Start watching.
        </h1>
        <p className="mt-4 text-white/60 leading-relaxed">
          You set your mood, they set theirs — separately. We find what actually overlaps, and pull it up on whatever
          you're already paying for.
        </p>

        <div className="mt-10">
          <Button fullWidth onClick={startSession} disabled={loading}>
            {loading ? "Starting..." : "Start tonight's watch"}
          </Button>
        </div>

        {error && <p className="mt-4 text-sm text-ember-400">{error}</p>}

        <p className="mt-6 text-xs text-white/35">
          You'll set your preferences first, then send a QR code to whoever you're watching with tonight.
        </p>
      </div>
    </main>
  );
}
