import { NextResponse } from "next/server";
import { getMatch, getTitlePool } from "@/lib/db";
import { getIndianStreamingOptions } from "@/lib/streaming";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const match = await getMatch(params.id);
  if (!match) return NextResponse.json({ error: "No match yet" }, { status: 404 });

  const pool = await getTitlePool(params.id, match.round);
  const title = pool.find((t) => t.tmdbId === match.tmdbId && t.mediaType === match.mediaType);
  if (!title) return NextResponse.json({ error: "Matched title not found" }, { status: 404 });

  let platforms: Awaited<ReturnType<typeof getIndianStreamingOptions>> = [];
  try {
    platforms = await getIndianStreamingOptions(match.tmdbId, match.mediaType);
  } catch (err) {
    console.error("Streaming availability lookup failed", err);
  }

  return NextResponse.json({ title, platforms });
}
