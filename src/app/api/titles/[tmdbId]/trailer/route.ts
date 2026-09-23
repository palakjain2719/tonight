import { NextRequest, NextResponse } from "next/server";

type TmdbVideo = { key: string; site: string; type: string; official: boolean };

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { tmdbId: string } }) {
  const mediaType = req.nextUrl.searchParams.get("mediaType") ?? "movie";
  const { tmdbId } = params;

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return NextResponse.json(null);

  const isBearer = apiKey.startsWith("eyJ");
  const headers: Record<string, string> = isBearer ? { Authorization: `Bearer ${apiKey}` } : {};
  const qs = isBearer ? "" : `&api_key=${apiKey}`;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/videos?language=en-US${qs}`,
      { headers, signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json(null);

    const json = (await res.json()) as { results: TmdbVideo[] };
    const yt = json.results.filter((v) => v.site === "YouTube");

    const best =
      yt.find((v) => v.type === "Trailer" && v.official) ??
      yt.find((v) => v.type === "Trailer") ??
      yt.find((v) => v.type === "Teaser") ??
      yt[0];

    return NextResponse.json(best ? { key: best.key } : null);
  } catch {
    return NextResponse.json(null);
  }
}
