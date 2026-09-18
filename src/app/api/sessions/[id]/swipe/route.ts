import { NextRequest, NextResponse } from "next/server";
import { getPreferences, getSession, partnerFinishedSwiping, recordSwipe, tryClaimStatus, updateSessionStatus } from "@/lib/db";
import { broadcast } from "@/lib/supabase/server";
import { generateSecondRoundPool, POOL_SIZE } from "@/lib/pool";
import type { MediaType, PartnerRole, SwipeDirection } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const partner: PartnerRole | undefined = body?.partner;
  const round: number = Number(body?.round);
  const tmdbId: number = Number(body?.tmdbId);
  const mediaType: MediaType | undefined = body?.mediaType;
  const direction: SwipeDirection | undefined = body?.direction;

  if (partner !== "a" && partner !== "b") return NextResponse.json({ error: "invalid partner" }, { status: 400 });
  if (!Number.isFinite(tmdbId)) return NextResponse.json({ error: "invalid tmdbId" }, { status: 400 });
  if (mediaType !== "movie" && mediaType !== "tv") return NextResponse.json({ error: "invalid mediaType" }, { status: 400 });
  if (direction !== "left" && direction !== "right") return NextResponse.json({ error: "invalid direction" }, { status: 400 });
  if (!Number.isFinite(round)) return NextResponse.json({ error: "invalid round" }, { status: 400 });

  const { isNewMatch } = await recordSwipe(sessionId, round, partner, tmdbId, mediaType, direction);

  if (isNewMatch) {
    await updateSessionStatus(sessionId, "matched", round);
    await broadcast(sessionId, "match_found", { round, tmdbId, mediaType });
    return NextResponse.json({ isNewMatch: true });
  }

  const [aDone, bDone] = await Promise.all([
    partnerFinishedSwiping(sessionId, round, "a", POOL_SIZE),
    partnerFinishedSwiping(sessionId, round, "b", POOL_SIZE),
  ]);

  if (aDone && bDone) {
    if (round === 1) {
      const claimed = await tryClaimStatus(sessionId, "swiping", 1, "generating");
      if (claimed) {
        try {
          const prefs = await getPreferences(sessionId);
          if (prefs.a && prefs.b) {
            await generateSecondRoundPool(sessionId, session.coupleId, prefs.a, prefs.b);
          }
          await updateSessionStatus(sessionId, "swiping", 2);
          await broadcast(sessionId, "round_advanced", { round: 2 });
        } catch (err) {
          console.error("Round 2 generation failed", err);
          await updateSessionStatus(sessionId, "swiping", 1);
        }
      }
    } else if (round === 2) {
      const claimed = await tryClaimStatus(sessionId, "swiping", 2, "final_choice");
      if (claimed) {
        await broadcast(sessionId, "final_choice_ready", { round: 2 });
      }
    }
  } else {
    await broadcast(sessionId, "partner_finished_swiping", { round, partner });
  }

  return NextResponse.json({ isNewMatch: false, aDone, bDone });
}
