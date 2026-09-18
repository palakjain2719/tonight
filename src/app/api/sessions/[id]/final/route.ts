import { NextResponse } from "next/server";
import { getAllSeenTitles, getSwipes } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const [titles, round1, round2] = await Promise.all([getAllSeenTitles(params.id), getSwipes(params.id, 1), getSwipes(params.id, 2)]);

  const scores = new Map<string, number>();
  for (const swipe of [...round1, ...round2]) {
    if (swipe.direction !== "right") continue;
    const key = `${swipe.mediaType}:${swipe.tmdbId}`;
    scores.set(key, (scores.get(key) || 0) + 1);
  }

  const ranked = titles
    .map((t) => ({ title: t, score: scores.get(`${t.mediaType}:${t.tmdbId}`) || 0 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({ topFive: ranked });
}
