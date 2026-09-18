import { NextRequest, NextResponse } from "next/server";
import { getIndianStreamingOptions } from "@/lib/streaming";
import type { MediaType } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { tmdbId: string } }) {
  const { searchParams } = new URL(req.url);
  const mediaType = searchParams.get("mediaType") as MediaType | null;
  const tmdbId = Number(params.tmdbId);

  if (!Number.isFinite(tmdbId) || (mediaType !== "movie" && mediaType !== "tv")) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const platforms = await getIndianStreamingOptions(tmdbId, mediaType);
    return NextResponse.json({ platforms });
  } catch (err) {
    console.error("Streaming availability lookup failed", err);
    return NextResponse.json({ platforms: [] });
  }
}
