import { getServiceClient } from "@/lib/supabase/server";
import type { CoupleHistorySummary } from "@/lib/anthropic";
import type { MediaType, PartnerRole, PreferenceInput, SessionStatus, SwipeDirection, Title } from "@/types";

export interface SessionRow {
  id: string;
  coupleId: string | null;
  status: SessionStatus;
  round: number;
}

function rowToSession(row: any): SessionRow {
  return { id: row.id, coupleId: row.couple_id, status: row.status, round: row.round };
}

export async function getOrCreateCouple(coupleId?: string | null): Promise<string> {
  const db = getServiceClient();
  if (coupleId) {
    const { data } = await db.from("couples").select("id").eq("id", coupleId).maybeSingle();
    if (data) return data.id;
  }
  const { data, error } = await db.from("couples").insert({}).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function createSession(coupleId: string): Promise<SessionRow> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("sessions")
    .insert({ couple_id: coupleId, status: "awaiting_b", round: 1 })
    .select("*")
    .single();
  if (error) throw error;
  return rowToSession(data);
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  const db = getServiceClient();
  const { data } = await db.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  return data ? rowToSession(data) : null;
}

export async function updateSessionStatus(sessionId: string, status: SessionStatus, round?: number) {
  const db = getServiceClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (round !== undefined) patch.round = round;
  const { error } = await db.from("sessions").update(patch).eq("id", sessionId);
  if (error) throw error;
}

/**
 * Atomic compare-and-swap on session status/round, used to guard against two
 * concurrent requests (one per partner's last swipe) both trying to trigger
 * the same round transition.
 */
export async function tryClaimStatus(sessionId: string, fromStatus: SessionStatus, fromRound: number, toStatus: SessionStatus): Promise<boolean> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("sessions")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", fromStatus)
    .eq("round", fromRound)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

function prefsRowToInput(row: any): PreferenceInput {
  return {
    moods: row.moods,
    moodText: row.mood_text || "",
    languages: row.languages,
    contentType: row.content_type,
    minRating: row.min_rating,
    eras: row.eras,
  };
}

export async function upsertPreferences(sessionId: string, partner: PartnerRole, prefs: PreferenceInput) {
  const db = getServiceClient();
  const { error } = await db.from("preferences").upsert(
    {
      session_id: sessionId,
      partner,
      moods: prefs.moods,
      mood_text: prefs.moodText || null,
      languages: prefs.languages,
      content_type: prefs.contentType,
      min_rating: prefs.minRating,
      eras: prefs.eras,
    },
    { onConflict: "session_id,partner" }
  );
  if (error) throw error;
}

export async function getPreferences(sessionId: string): Promise<{ a: PreferenceInput | null; b: PreferenceInput | null }> {
  const db = getServiceClient();
  const { data, error } = await db.from("preferences").select("*").eq("session_id", sessionId);
  if (error) throw error;
  const a = data?.find((r) => r.partner === "a");
  const b = data?.find((r) => r.partner === "b");
  return { a: a ? prefsRowToInput(a) : null, b: b ? prefsRowToInput(b) : null };
}

export async function saveBrief(sessionId: string, round: number, brief: unknown) {
  const db = getServiceClient();
  const { error } = await db
    .from("briefs")
    .upsert({ session_id: sessionId, round, brief }, { onConflict: "session_id,round" });
  if (error) throw error;
}

export async function saveTitlePool(sessionId: string, round: number, titles: Title[]) {
  const db = getServiceClient();
  if (titles.length === 0) return;
  const rows = titles.map((t) => ({
    session_id: sessionId,
    round,
    tmdb_id: t.tmdbId,
    media_type: t.mediaType,
    title: t.title,
    year: t.year,
    poster_path: t.posterPath,
    overview: t.overview,
    runtime: t.runtime,
    imdb_rating: t.imdbRating,
    genres: t.genres,
  }));
  const { error } = await db.from("titles").upsert(rows, { onConflict: "session_id,round,tmdb_id,media_type" });
  if (error) throw error;
}

function rowToTitle(row: any): Title {
  return {
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    posterPath: row.poster_path,
    overview: row.overview,
    runtime: row.runtime,
    imdbRating: row.imdb_rating,
    genres: row.genres || [],
  };
}

export async function getTitlePool(sessionId: string, round: number): Promise<Title[]> {
  const db = getServiceClient();
  const { data, error } = await db.from("titles").select("*").eq("session_id", sessionId).eq("round", round);
  if (error) throw error;
  return (data || []).map(rowToTitle);
}

export async function getAllSeenTitles(sessionId: string): Promise<Title[]> {
  const db = getServiceClient();
  const { data, error } = await db.from("titles").select("*").eq("session_id", sessionId);
  if (error) throw error;
  return (data || []).map(rowToTitle);
}

export async function recordSwipe(
  sessionId: string,
  round: number,
  partner: PartnerRole,
  tmdbId: number,
  mediaType: MediaType,
  direction: SwipeDirection
): Promise<{ isNewMatch: boolean }> {
  const db = getServiceClient();
  const { error } = await db.from("swipes").upsert(
    { session_id: sessionId, round, partner, tmdb_id: tmdbId, media_type: mediaType, direction },
    { onConflict: "session_id,round,partner,tmdb_id,media_type" }
  );
  if (error) throw error;

  if (direction !== "right") return { isNewMatch: false };

  const { data: swipes, error: swErr } = await db
    .from("swipes")
    .select("partner,direction")
    .eq("session_id", sessionId)
    .eq("round", round)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType);
  if (swErr) throw swErr;

  const bothLiked = ["a", "b"].every((p) => swipes?.some((s) => s.partner === p && s.direction === "right"));
  if (!bothLiked) return { isNewMatch: false };

  const { data: existing } = await db
    .from("matches")
    .select("id")
    .eq("session_id", sessionId)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();
  if (existing) return { isNewMatch: false };

  const { error: matchErr } = await db.from("matches").insert({ session_id: sessionId, round, tmdb_id: tmdbId, media_type: mediaType });
  if (matchErr) throw matchErr;
  return { isNewMatch: true };
}

export interface SwipeRow {
  partner: PartnerRole;
  tmdbId: number;
  mediaType: MediaType;
  direction: SwipeDirection;
}

export async function getSwipes(sessionId: string, round: number): Promise<SwipeRow[]> {
  const db = getServiceClient();
  const { data, error } = await db.from("swipes").select("*").eq("session_id", sessionId).eq("round", round);
  if (error) throw error;
  return (data || []).map((r) => ({ partner: r.partner, tmdbId: r.tmdb_id, mediaType: r.media_type, direction: r.direction }));
}

export async function partnerFinishedSwiping(sessionId: string, round: number, partner: PartnerRole, poolSize: number): Promise<boolean> {
  const db = getServiceClient();
  const { count, error } = await db
    .from("swipes")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("round", round)
    .eq("partner", partner);
  if (error) throw error;
  return (count ?? 0) >= poolSize;
}

export async function getMatch(sessionId: string): Promise<{ tmdbId: number; mediaType: MediaType; round: number } | null> {
  const db = getServiceClient();
  const { data } = await db.from("matches").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!data) return null;
  return { tmdbId: data.tmdb_id, mediaType: data.media_type, round: data.round };
}

export async function saveRating(sessionId: string, tmdbId: number, mediaType: MediaType, rating: number, notes?: string) {
  const db = getServiceClient();
  const { error } = await db.from("ratings").insert({ session_id: sessionId, tmdb_id: tmdbId, media_type: mediaType, rating, notes: notes || null });
  if (error) throw error;
}

export async function getCoupleHistory(coupleId: string | null, excludeSessionId: string): Promise<CoupleHistorySummary> {
  if (!coupleId) return { lovedTitles: [], mehTitles: [] };
  const db = getServiceClient();

  const { data: sessions } = await db.from("sessions").select("id").eq("couple_id", coupleId).neq("id", excludeSessionId);
  const sessionIds = (sessions || []).map((s) => s.id);
  if (sessionIds.length === 0) return { lovedTitles: [], mehTitles: [] };

  const { data: ratings } = await db.from("ratings").select("session_id,tmdb_id,media_type,rating").in("session_id", sessionIds);
  if (!ratings || ratings.length === 0) return { lovedTitles: [], mehTitles: [] };

  const titleIds = ratings.map((r) => `${r.session_id}:${r.tmdb_id}:${r.media_type}`);
  const { data: titleRows } = await db.from("titles").select("session_id,tmdb_id,media_type,title").in("session_id", sessionIds);
  const nameFor = (sessionId: string, tmdbId: number, mediaType: string) =>
    titleRows?.find((t) => t.session_id === sessionId && t.tmdb_id === tmdbId && t.media_type === mediaType)?.title;

  const lovedTitles: string[] = [];
  const mehTitles: string[] = [];
  for (const r of ratings) {
    const name = nameFor(r.session_id, r.tmdb_id, r.media_type);
    if (!name) continue;
    if (r.rating >= 4) lovedTitles.push(name);
    else mehTitles.push(name);
  }
  void titleIds;

  return {
    lovedTitles: Array.from(new Set(lovedTitles)).slice(0, 10),
    mehTitles: Array.from(new Set(mehTitles)).slice(0, 10),
  };
}

export async function getPastSessionsForCouple(coupleId: string) {
  const db = getServiceClient();
  const { data } = await db
    .from("sessions")
    .select("id,status,round,created_at")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}
