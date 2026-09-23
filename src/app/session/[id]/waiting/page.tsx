"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRShare } from "@/components/QRShare";
import { Loader, rotatingMessage } from "@/components/Loader";
import { getRole, pathForStatus } from "@/lib/clientSession";
import { useSessionStatus } from "@/lib/useSessionStatus";

export default function WaitingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState<"a" | "b" | null>(null);
  const [joinLink, setJoinLink] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const { data } = useSessionStatus(id);

  useEffect(() => {
    const r = getRole(id);
    if (!r) {
      router.replace("/");
      return;
    }
    setRole(r);
    setJoinLink(`${window.location.origin}/join/${id}`);
  }, [id, router]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data) return;
    if (data.status !== "awaiting_b" && data.status !== "generating") {
      router.replace(pathForStatus(id, data.status));
    }
  }, [data, id, router]);

  if (!role) return null;

  const isGenerating = data?.status === "generating";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-full max-w-sm">
        {isGenerating ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-ink">Both of you are in.</h1>
            <p className="mt-1 text-muted">We're reconciling your moods and pulling tonight's picks.</p>
            <Loader label={rotatingMessage(elapsed)} />
          </>
        ) : role === "a" ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-ink">You're set.</h1>
            <p className="mt-1 mb-8 text-muted">Send this to whoever you're watching with tonight.</p>
            {joinLink && <QRShare link={joinLink} />}
            <p className="mt-8 text-sm text-faint">Waiting for them to join and set their mood...</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-ink">Got it.</h1>
            <Loader label="Waiting on the rest of your session..." />
          </>
        )}
      </div>
    </main>
  );
}
