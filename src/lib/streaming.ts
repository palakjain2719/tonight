import type { MediaType, StreamingLink } from "@/types";

const BASE = "https://streaming-availability.p.rapidapi.com";

interface RawStreamingOption {
  service: { id: string; name: string };
  type: "free" | "subscription" | "buy" | "rent" | "addon";
  link: string;
  quality?: string;
}

/** Live "where to watch in India, right now" lookup via RapidAPI's Streaming Availability API. */
export async function getIndianStreamingOptions(tmdbId: number, mediaType: MediaType): Promise<StreamingLink[]> {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || "streaming-availability.p.rapidapi.com";
  if (!key) {
    throw new Error("RAPIDAPI_KEY is not set in .env.local.");
  }

  const url = `${BASE}/shows/${mediaType}/${tmdbId}?country=in&series_granularity=show&output_language=en`;
  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": host,
    },
    cache: "no-store",
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Streaming availability lookup failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const options: RawStreamingOption[] = json?.streamingOptions?.in || [];

  const dedup = new Map<string, StreamingLink>();
  for (const opt of options) {
    if (!opt.service?.id || dedup.has(opt.service.id)) continue;
    dedup.set(opt.service.id, {
      serviceId: opt.service.id,
      serviceName: opt.service.name,
      type: opt.type,
      link: opt.link,
      quality: opt.quality ?? null,
    });
  }
  return Array.from(dedup.values());
}
