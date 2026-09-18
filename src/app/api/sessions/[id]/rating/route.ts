import { NextRequest, NextResponse } from "next/server";
import { saveRating, updateSessionStatus } from "@/lib/db";
import type { MediaType } from "@/types";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const mediaType: MediaType | undefined = body?.mediaType;
  const rating = Number(body?.rating);
  const notes: string | undefined = body?.notes;

  if (!Number.isFinite(tmdbId) || (mediaType !== "movie" && mediaType !== "tv") || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await saveRating(params.id, tmdbId, mediaType, rating, notes);
  await updateSessionStatus(params.id, "completed");
  return NextResponse.json({ ok: true });
}
