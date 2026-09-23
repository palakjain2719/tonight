import { NextRequest, NextResponse } from "next/server";
import { getPreferences, getSession, tryClaimStatus, updateSessionStatus, upsertPreferences } from "@/lib/db";
import { broadcast } from "@/lib/supabase/server";
import { generateFirstRoundPool } from "@/lib/pool";
import { sanitizeMoodText } from "@/lib/sanitize";
import type { PartnerRole, PreferenceInput } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const partner: PartnerRole | undefined = body?.partner;
  const preferences: PreferenceInput | undefined = body?.preferences;
  if (partner !== "a" && partner !== "b") {
    return NextResponse.json({ error: "partner must be 'a' or 'b'" }, { status: 400 });
  }
  if (!preferences) {
    return NextResponse.json({ error: "preferences is required" }, { status: 400 });
  }

  const sanitized: PreferenceInput = {
    ...preferences,
    moodText: sanitizeMoodText(preferences.moodText ?? ""),
  };

  await upsertPreferences(sessionId, partner, sanitized);
  await broadcast(sessionId, "partner_joined", { partner });

  const both = await getPreferences(sessionId);
  if (!both.a || !both.b) {
    return NextResponse.json({ ok: true, waitingOnPartner: true });
  }

  const claimed = await tryClaimStatus(sessionId, "awaiting_b", 1, "generating");
  if (!claimed) {
    // The other partner's request already kicked off generation.
    return NextResponse.json({ ok: true, waitingOnPartner: false });
  }

  try {
    await generateFirstRoundPool(sessionId, session.coupleId, both.a, both.b);
    await updateSessionStatus(sessionId, "swiping", 1);
    await broadcast(sessionId, "pool_ready", { round: 1 });
    return NextResponse.json({ ok: true, waitingOnPartner: false, poolReady: true });
  } catch (err) {
    console.error("Pool generation failed", err);
    await updateSessionStatus(sessionId, "awaiting_b", 1);
    return NextResponse.json({ error: "Could not generate tonight's picks. Please try again." }, { status: 500 });
  }
}
