import { NextRequest, NextResponse } from "next/server";
import { getSession, getTitlePool } from "@/lib/db";
import { seededShuffle } from "@/lib/shuffle";
import type { PartnerRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  const { searchParams } = new URL(req.url);
  const partner = searchParams.get("partner") as PartnerRole | null;
  const round = Number(searchParams.get("round") || "1");

  if (partner !== "a" && partner !== "b") {
    return NextResponse.json({ error: "partner query param must be 'a' or 'b'" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const pool = await getTitlePool(sessionId, round);
  const ordered = seededShuffle(pool, `${sessionId}:${round}:${partner}`);

  return NextResponse.json({ round, status: session.status, titles: ordered });
}
