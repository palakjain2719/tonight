# Tonight — a movie/TV matchmaker for two

Two independent preference forms → Gemini reconciles them into a search
brief → TMDB supplies 30 candidate titles → both partners swipe → a match
(or a top-5 fallback after two rounds) shows exactly where to watch it in
India right now.

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind) — one codebase for the UI and the API routes that call Claude/TMDB/RapidAPI server-side, so no key ever reaches the browser.
- **Supabase** (Postgres + Realtime) — session/preference/swipe/match/rating storage. All table access goes through server-side routes using the service-role key; the browser only subscribes to a Realtime *broadcast* channel per session (`session:{id}`) to know instantly when a partner joins, the pool is ready, a match lands, or a round advances. A 3s poll runs alongside it as a fallback if a broadcast is missed.
- **Google Gemini** — reconciles both partners' structured picks *and* free-text mood descriptions into one TMDB search brief (genres, keywords, year range, rating floor), both for round 1 and the sharper round 2. It's called via forced function-calling so the response is always well-formed JSON.
- **TMDB** — the actual title data (posters, overview, genres, year, TMDB rating). Free-text keyword phrases from Claude's brief are resolved to TMDB keyword ids before being used in `/discover`, since that filter only accepts ids.
- **RapidAPI "Streaming Availability"** (movie-of-the-night) — live India (`country=in`) streaming links per title, with direct deep links per platform.

## Getting this running

This was built in an environment with no Node.js installed, so nothing has
been run or `npm install`-ed yet. On a machine with Node 18+:

```bash
npm install
cp .env.local.example .env.local   # then fill in the keys below
npm run dev
```

### Keys you need

| Env var | Where to get it |
|---|---|
| `GEMINI_API_KEY` | aistudio.google.com/app/apikey |
| `TMDB_API_KEY` / `TMDB_READ_ACCESS_TOKEN` | themoviedb.org/settings/api — either the v3 key or the v4 read-access token both work |
| `RAPIDAPI_KEY` / `RAPIDAPI_HOST` | rapidapi.com → subscribe to "OTT Details" by gox-ai |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | your Supabase project's API settings |

### Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL
editor (or `supabase db push`). It creates all tables with RLS **enabled and
no policies** — safe by default, since only the server-side service-role
key ever touches them directly.

## How a session flows

1. `/` → Partner A taps "Start tonight's watch" → `POST /api/sessions` creates a session row and a `couples` row (id cached in `localStorage`, so returning on the same browser links future sessions to history).
2. Partner A fills `PreferenceForm` → `POST /api/sessions/[id]/preferences` → session sits at `awaiting_b`.
3. Partner A lands on the waiting screen, which renders a QR code (client-generated via the `qrcode` package) for `/join/[id]`, plus a "Share" button that uses the Web Share API to send the QR **image** itself to any messaging app, falling back to sharing the link or copying it if `navigator.share` isn't available.
4. Partner B scans/opens the link, is assigned role `b`, and fills the same form independently — they never see A's answers (nothing is sent to B's client; both profiles only ever meet server-side).
5. The moment both preference rows exist, the same request that completed B's submission calls Claude (`generateSearchBrief`) then TMDB (`buildTitlePool`) synchronously, saves 30 titles, flips the session to `swiping`, and broadcasts `pool_ready`. A's waiting screen (listening the whole time) flips to the swipe deck within the same couple of seconds.
6. Both partners swipe through the *same 30 titles*, each in their own deterministic-but-different shuffle (seeded by `sessionId:round:partner`, so a reload doesn't reshuffle mid-session). A right swipe from both partners on the same title is a match, detected server-side on every swipe write.
7. Match → both screens (already listening) redirect simultaneously to a reveal screen with full details and live India streaming links.
8. No match after round 1 → once both finish, Claude gets round 1's right-swipes as signal and produces a sharper round-2 brief; TMDB pool excludes every title already seen this session.
9. Still no match after round 2 → both partners see the top 5 titles ranked by combined right-swipe count (0–2), to decide over together.
10. After watching, either partner can leave a 1–5 rating from the match screen. Future sessions for the same `coupleId` feed loved (4–5★) vs. didn't-land titles back into Claude's brief prompt.

## Known simplifications (by design, given the 4-connection scope)

- **"IMDb rating" uses TMDB's own `vote_average`.** TMDB doesn't expose real IMDb scores, and adding OMDb just for that would be a 5th external service outside what was scoped. It's the closest available signal (same 0–10 scale) and is labelled generically in the UI copy.
- **Language/era/rating reconciliation is deterministic, not left to Claude:** minimum rating uses the *stricter* of the two partners' floors; language and era use the *union* of both (so e.g. one partner picking Hindi and the other English doesn't zero out the pool); "movies only" from either partner overrides "include series" for the other. Claude works within those hard bounds to pick the actual genres/keywords, so it can't accidentally widen them.
- **"Couple" identity is a `localStorage` id**, not an account — there's no auth in the spec. If someone clears storage or switches browsers, that thread of history breaks; the app still works, it just starts fresh for that device.
- **Streaming availability is looked up live** (not cached) on the match screen and on each top-five expand — RapidAPI's free/starter tiers have fairly low request quotas, worth checking before a lot of testing.
- **If Claude/TMDB errors out mid-generation**, round 1 (triggered from the preferences submit) resets and retries cleanly the next time either partner's client resubmits. Round 2 (triggered from the last swipe of round 1) currently has no automatic retry if it fails — both partners would see the "waiting for your partner" screen indefinitely. This should be rare (transient API errors only) but worth wiring a retry/alert for before relying on this in production.
