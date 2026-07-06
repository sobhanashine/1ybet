# Live API audit — home page live flow

**Branch:** `feat/audit-live-api` (off `dev`)
**Date:** 2026-07-06
**Scope:** read-only audit; no code changes.

## What's checked

The end-to-end path by which the **home page** (and the match detail page) shows
in-play scores for a running match:

```
page renders
  └─ MatchCard / MatchScore (client component)
       └─ useLiveScore(extId)                       ← components/LiveScores.tsx
            └─ LiveScoresContext
                 └─ set every 30 s from /api/live   ← LiveScoresProvider fetches
                                                       while active=true
flow:
  useLiveScore  ─fetch─▶  /api/live  ─fetch─▶  lib/football-api.fetchLiveScores
                                                   └─ GET /competitions/{WC}/matches
                                                       (football-data.org free tier)
                                                   └─ filter status IN_PLAY | PAUSED
```

Four files do the work: `app/api/live/route.ts`, `components/LiveScores.tsx`,
`lib/football-api.ts` (`fetchLiveScores`), `lib/time.ts` (`isLiveWindow`).
Plus `proxy.ts` (auth gate), `app/(app)/page.tsx` (gate), `app/(app)/match/[id]/page.tsx`
(same gate on the match detail), and `components/MatchCard.tsx` / `components/MatchScore.tsx`
(consumers).

## What works

- **Correct gating.** `liveActive = matches.some(m => m.status !== "FINISHED" && isLiveWindow(m.kickoffAt))`.
  `isLiveWindow` is `now − 180 min ≤ kickoff ≤ now + 5 min` — so polling
  starts 5 min before kickoff and continues until ~3 h after. The DB status gate
  is fine because the cron (`scripts/resync.ts`) flips a match's status to
  `LIVE` within ~5 min of kickoff and to `FINISHED` once it resolves; the polling
  continues regardless because the live-window check only needs the kickoff time.
- **Server cache + in-flight dedup.** `app/api/live/route.ts` keeps a 20 s TTL
  in-memory cache and an `inFlight` Promise so collapsing clients don't create
  duplicate upstream calls. £alwa: any logged-in client → at most 1 upstream per
  20 s per instance, regardless of how many tabs are open.
- **Client-side throttling.** 30 s `setInterval` + skips when tab hidden + refresh
  on `visibilitychange` to "visible". AbortController tears down in-flight fetch
  on unmount. `cache:"no-store"` so the browser doesn't keep its own stale copy.
- **Fail-safe by construction.** Both sides swallow errors silently: the route
  logs and returns `{ matches: [] }`; the provider keeps the last known scores
  on a failed poll (`catch {}`). The page never breaks, the last seen live score
  keeps showing.
- **Type shape is consistent across server + client.** `fetchLiveScores` returns
  `LiveScore[]` with `extId: 'fd-<id>'`. Both `MatchCard` and `MatchScore` build
  the same extId and consume `{ home, away, status: "LIVE" }`.
- **Auto-scroll integration.** `MatchCard.isNext` panel still scrolls to the next
  match when `live` becomes available — `showLive = !finished && !!live`, controlled
  by the same context, so the card's center swaps to the live score without
  stealing focus.

## Identified issues / observations

### Minor — observable but benign

1. **Polling continues with `match.status === "FINISHED"` if `isLiveWindow` is
   still true.** The DB cron can take up to ~5 min to flip a match to
   `FINISHED`. During that gap, the provider polls and the route returns…
   probably 0 live matches for the just-finished one (because football-data.org
   already reports `FINISHED` upstream). UI shows the live box for ≤5 min after
   full-time even though `match.homeScore` is still null in our DB. Acceptable
   trade for cron latency.
2. **3-hour cut-off for the live window may bite extra-time matches.** A match
   that goes to 120 min + penalties can still be legitimately `IN_PLAY` after the
   `now − 180 min` boundary closes. Polling stops; user keeps seeing the last
   known live score; the cron eventually flips status to `FINISHED`. UX impact:
   the live box stops updating mid-extra-time. Low frequency; reasonable trade
   against the 1 call per 20 s quota.

### Notable — worth fixing if you can spare ~10 lines

3. **`fetchLiveScores()` reuses the same upstream endpoint as
   `fetchWorldCupMatches()`.** football-data.org supports a `?status=LIVE`
   query parameter that returns only in-play matches and is much smaller. Both
   callers still paginate through the full match list and filter in-process.
   The shared endpoint also means a live-poll cache miss on the server triggers
   the same heavy fetch as a sync call. Worth switching `fetchLiveScores` to the
   narrower endpoint (`?status=LIVE`) once the free tier's quota allows the
   extra call shape. Trade: one extra route to test against the API on a real
   match day.
4. **Quota amplification across Vercel instances is unbounded by the in-memory
   cache.** With one instance on the Hobby plan, this is fine. As soon as the
   project lands on a multi-region / multi-pod plan, each pod has its own cache,
   and `liveActive` brings polling everywhere → N pods × 3 req/min upstream. The
   safe fix later is a single shared cache (Vercel KV / Upstash Redis) or a
   narrower endpoint. Not an issue today.

### Looks-like-a-bug but isn't

5. **`proxy.ts` redirects `/api/live` → `/login` when no session cookie.** I
   verified this with `curl` (307 in 6 ms, no upstream call). Reasoning: the
   proxy gates *every* non-public path, and `/api/live` isn't whitelisted.
   Real-world impact: zero — the browser sends the session cookie with every
   fetch so clients in `/` and `/match/[id]` get JSON, not a redirect. Worth
   noting that **`/api/webhook` and `/api/cron/*` are intentionally whitelisted**
   in the proxy but `/api/live` is not — that creates an asymmetry where live
   polling is implicitly user-gated. If we ever want partner widgets / webhooks
   to consume `/api/live` (e.g. Telegram inline query updates), this would need
   an explicit allow-list + a per-IP rate limit.
6. **No "stop polling if upstream returns 0 live matches" optimization.**
   During the 5 min pre-kickoff window the server returns 0 matches but the
   client still polls every 30 s. Cost is negligible (cache absorbs repeats) and
   window is short, so leave as-is.

## Direct end-to-end probe

Run against the running dev server (no cookie):

```
GET http://localhost:3000/api/live
→ HTTP/1.1 307 Temporary Redirect
→ location: /login
```

Same probe with a valid session cookie (browser does this automatically when the
user is logged in) returns JSON: `{ matches: LiveScore[] }` per the route.

## TL;DR

The home-page live flow is **structurally correct and safe** — gating, caching,
in-flight dedup, fail-safe, type bridging, tab visibility, and auto-scroll all
check out. Three improvements worth filing for later (`?status=LIVE`, an
extra-time tolerant window, and a shared cache if you ever multi-pod), and one
design note (the implicit auth-gate on `/api/live` is fine today but should
become explicit if API consumers change).

No code changes shipped on this branch — only this document.
