"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PreferenceForm } from "@/components/PreferenceForm";
import { getRole } from "@/lib/clientSession";
import type { PreferenceInput } from "@/types";

export default function PreferencesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRoleState] = useState<"a" | "b" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = getRole(id);
    if (!r) {
      router.replace("/");
      return;
    }
    setRoleState(r);
  }, [id, router]);

  async function handleSubmit(preferences: PreferenceInput) {
    if (!role) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${id}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner: role, preferences }),
      });
      if (!res.ok) throw new Error("failed");
      router.push(`/session/${id}/waiting`);
    } catch {
      setError("Couldn't save your preferences — check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!role) return null;

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ember-400">
          Partner {role.toUpperCase()}
        </p>
        <h1 className="font-display text-2xl font-semibold">Set your mood for tonight</h1>
        <p className="mt-1 text-sm text-white/50">
          Answer for yourself — your partner won't see this until you're both done.
        </p>

        <div className="mt-8">
          <PreferenceForm onSubmit={handleSubmit} submitting={submitting} />
        </div>

        {error && <p className="mt-4 text-sm text-ember-400">{error}</p>}
      </div>
    </main>
  );
}
