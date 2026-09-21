# Implementation Plan: YouTube Subscribed Channels Face-Off

Source of truth: `PRD_YouTube_Subscribed_Channels_Face-Off.pdf` (extracted to `docs/prd.txt`).
Status: In progress.

## Decisions
- **Local-first**: run in development locally; no hosting/deploy for version one.
- **OAuth**: real Google OAuth 2.0 web-server flow (required for `youtube.readonly`).
- **Keyboard control**: on the matchup screen, pressing **Left Arrow** chooses the left channel and **Right Arrow** chooses the right channel. The choice buttons remain focusable/clickable and must show a visible focus style; arrows work regardless of focus. This must be covered by accessibility tests.

## Stack
- Frontend: Vite + React + TypeScript
- Backend: Node 20 + Fastify (serves built frontend + `/api/*`)
- Game logic: pure TypeScript module, unit-tested with Vitest (no API calls)
- E2E: Playwright with mocked Google/YouTube routes
- Styling: single global CSS file (Flexbox/Grid + media queries). No UI framework.
- Sessions: signed HttpOnly cookie -> server-side in-memory token store. Tokens and secrets never leave the server.

## Directory structure
```
faceoff/
|- server/           # auth + youtube service layers
|  |- oauth.ts       # auth URL, state/CSRF, code exchange, reconnect
|  |- youtube.ts     # paginated subscriptions.list, normalization, error mapping
|  |- store.ts       # in-memory sessions + tokens
|  |- routes.ts      # Fastify route registration
|  |- index.ts       # Fastify bootstrap + static serving
|- src/              # UI layer
|  |- game/          # pure logic: dedupe, shuffle, pairing, byes, progress, winner
|  |  |- types.ts
|  |  |- game.ts
|  |  |- game.test.ts
|  |- screens/       # Landing, Loading, Ready, Matchup, Result, Error
|  |- api.ts         # fetch wrapper for /api/*
|  |- App.tsx
|  |- main.tsx
|  |- styles.css
|- playwright/       # e2e specs with mocked routes
|- docs/prd.txt
|- .env.example
|- .env.local        # local secrets (gitignored)
|- package.json
|- PLAN.md
```

## Phases

### Phase 1 - Scaffold
- Vite + React + TS project, Fastify server, env config, scripts: `dev`, `build`, `start`, `typecheck`, `test`.
- `.gitignore`, `.env.example`, base Fastify app serving `dist/` statically.
- Done when both `tsc --noEmit` and the dev server boot cleanly.

### Phase 2 - Game core (pure, tested first) ✅
- Deduplicate by channel ID, randomize order once per game, pair left to right, bye for odd rounds, never pair a channel with itself.
- `advance(choice)` recomputes rounds; double-click guarded via `createAdvanceGuard()`.
- Keeps the PRD `FaceOffGame` shape + `round` counter.
- Vitest: 17 tests cover 2/3/4/5 channels, no self-pair, left/right advance, double-click guard, Play Again reset+reshuffle, updated-subscriptions replacement, malformed-record sanitizing.

### Phase 3 - UI screens (mock data) ✅
- White/black plain design, narrow centered layout, semantic HTML, real buttons (plain CSS only).
- Matchup screen: cards side by side on desktop, stacked left-then-right on mobile.
- Keboard: Left/Right arrow selection + visible focus styles + accessible names (`Choose <channel>`).
- Screens: Landing, Connecting, Ready, Matchup, Result, ErrorScreen; empty/one-channel states on Ready.
- `src/api.ts` typed fetch wrapper + `ApiError` kinds; `src/mock.ts` mock subscriptions for preview.
- App.tsx state machine with `createAdvanceGuard` shared across clicks/keys.
- Reduced-motion support, contrast, alt text / placeholders.
- RTL component tests (26 total): matchup render/a11y/click/arrows/placeholder, full App flow via keyboard incl. Play Again + start-over.

### Phase 4 - OAuth layer ✅
- `GET /api/auth/url`: creates a session, stores CSRF state server-side, signs `fo_session` HttpOnly cookie, returns Google consent URL (scope `youtube.readonly`, `access_type=offline`).
- `GET /api/auth/callback`: verifies state, exchanges code, stores tokens in the session; maps `access_denied`/bad-state/exchange failures to `?oauth_error=oauth_cancelled|oauth_failed` redirects.
- `GET /api/auth/status` + `POST /api/auth/disconnect`.
- `SessionStore`: in-memory sessions w/ TTL. `createOAuth` is fully injectable (token endpoint + fetch) for unit tests.

### Phase 5 - YouTube service layer ✅
- `createYoutube.fetchAllSubscriptions`: full pagination of `subscriptions.list` (`part=snippet&mine=true`, maxResults 50, pageToken loop).
- Normalization: id/title/thumbnailUrl (medium > default > high)/channelUrl derivation, dedupe, malformed-record skipping.
- Error mapping: 401/403 -> session_expired (triggers server-side refresh + retry once), 429/5xx -> api_failure (retryable), 401.. no session -> session_expired, transport failures -> network.
- `/api/subscriptions` returns `{ ok, channels }` or `{ ok:false, error }` matching the client `ApiError` kinds.

### Phase 6 - Integration ✅
- `src/dataClient.ts` lazily switches mock vs real (`VITE_USE_MOCK`, default mock).
- App boots by restoring the session; `reachReady(forceReconnect)` factors OAuth connect vs plain reload; auth errors (oauth_cancelled/oauth_failed/session_expired) route to full reconnect, others to reload without re-auth.
- Start Over reloads subscriptions without an OAuth round-trip; `?oauth_error` handled on load.
- Client integration tests (`src/integration.test.tsx`, jsdom + stubbed `fetch` in real mode): restored-session -> Ready, no session -> Landing, expired session -> reconnect error, full keyboard/click play-through, full OAuth round-trip via auth URL redirect. 57 tests passing total.
- Remaining for real Google flow: verify end-to-end against Google (needs `.env.local` credentials + consent screen); Playwright e2e in Phase 7.

### Phase 7 - E2E + acceptance pass ✅
- Playwright (chromium) suite `playwright/faceoff.spec.ts` with an in-process mock: `server/e2eMock.ts` registers `/e2e/*` (scenario switch, token endpoint, subscriptions endpoint) when `E2E_MOCK=true`; server endpoints become env-configurable (`E2E_TOKEN_ENDPOINT`, `E2E_SUBSCRIPTIONS_ENDPOINT`); Vite proxies `/e2e`.
- e2e boots via `npm run dev:e2e` (server + `vite --mode e2e`, `.env.e2e` sets `VITE_USE_MOCK=false`) so the app runs fully real against mocked Google/YouTube.
- 9 e2e tests: landing real-mode (status hit), OAuth round-trip with pagination + full keyboard play-through + Play Again + Start Over, mouse clicks, deny-cancel error, single-channel state, empty state, API-failure retry, expired-session reconnect via OAuth, silent access-token refresh. All with mocked consent screen attached to the real CSRF state.
- Bugs caught by e2e: React dev double-invoking the state updater broke `createAdvanceGuard` (guard recomputed per replay; now reads a ref outside the updater), `?oauth_error=oauth_cancelled` was mapped to the wrong screen, and zero/one-channel "Refresh" correctly drives a reconnect round-trip.
- Verification: unit + integration 57 passing, typecheck 0, build OK, e2e 9/9 passing.

### Phase 8 - Release hardening (local) ✅
- **Privacy page** (`src/Privacy.tsx`): read-only scope, tokens in server memory, no long-term storage, no sold/shared data, how to revoke. Served at `/privacy` via the SPA fallback and linked from the Landing screen; unit-tested.
- **Security headers** (`server/security.ts`, applied to all responses): CSP (`default-src 'self'`, `img-src` allows `https:` for `i.ytimg.com` thumbnails, `frame-ancestors 'none'`), HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `referrer-policy: no-referrer`, `permissions-policy`. Verified on `/` and `/privacy`.
- **Docs**: `docs/oauth-setup.md` (GCP project, enable YouTube Data API v3, consent screen as External + youtube.readonly + test users, web-client credentials with redirect URI `http://localhost:5173/api/auth/callback`, `.env.local`, manual verification checklist, troubleshooting) and `docs/quota.md` (quota units per request, on-demand fetching, increase/reset). `.env.example` documents the e2e-only vars.
- Verification: 58 unit/integration tests, typecheck 0, build OK, 9/9 e2e, prod smoke returns 200 + headers on `/` and `/privacy`.
- Remaining manual step for real Google flow: create Google credentials per `docs/oauth-setup.md`, fill `.env.local`, then run the manual verification checklist (consent screen, grant/deny, reconnect after server restart). Efficient for the user to do once.

## Unit/coverage expansion (added)
- Direct unit tests for the client data layers and remaining screens: `src/api.test.ts` (session status, subscription sanitizing + ApiError kind mapping, OAuth redirect), `src/dataClient.test.ts` (mock/real mode switching via `vi.stubEnv`), `src/mock.test.ts` (shape + defensive copies), and `Landing`/`Connecting`/`Ready`/`Result`/`ErrorScreen` screen tests; `server/config.test.ts` covers defaults + overrides.
- Coverage tooling: `@vitest/coverage-v8` (pinned to `3.2.7` to match vitest), `npm run test:coverage`, thresholds enforced in `vitest.config.ts` (statements 80 / branches 80 / functions 85 / lines 80), excludes `server/e2eMock.ts`.
- Verification: 99 unit/integration tests passing, typecheck 0, build OK, coverage 86.86% statements (client screens/data layers at 100%, `server/config.ts` 94.7%). Note: `coverage/` is gitignored; on Windows the prior run may leave a locked `coverage/` dir (EPERM) — remove it before re-running coverage.

## Tournament bracket UI (added)
- Single-elimination bracket rendered alongside the comparison/matchup and on the result screen as a purely visual representation (decisions still happen on the comparison screen).
- `Channel` gains optional `subscriberCount`; the game records a `history: PlayedMatch[]` (round, left, right, winner) so the bracket can be derived purely from game state — `src/game/types.ts`, advanced in `src/game/game.ts`, sanitized when positive & finite.
- New pure module `src/bracket.ts`: `buildBracket(game) -> BracketModel` with `totalRounds`, `roundLabel` (Final/Semifinals/Quarterfinals/Round N by distance from the last round), per-round match derivation with states `played | bye | active | pending | tbd` (byes reconstructed from unplayed participants), and `formatSubscriberCount` (B/M/K).
- New `src/screens/Bracket.tsx`: round columns + connector lines, avatar/name/subscriber-count cards, VS badge on the active matchup, won/lost strikethrough styling on played matches, TBD placeholders for future rounds, highlighted Final round + champion band. Styled in `src/styles.css` (`--color-line`, won/lost colors, `.bracket__*`) with horizontal scroll on mobile.
- Wired into `Matchup` and `Result`; mock subscriptions carry `subscriberCount` where known.
- Tests: `src/bracket.test.ts` (round counts/labels, bye reconstruction, played/active/pending/tbd states, champion, no mutation), `src/screens/Bracket.test.tsx` (labels, VS badge, subscriber formatting, champion, empty model -> nothing), game history lifecycle tests, sanitized subscriberCount passthrough.
- Verification: 120 unit/integration tests passing, typecheck 0, build OK, coverage 89.26% statements.

## Keyboard-control requirements (added)
- Left Arrow / Right Arrow choose left / right channel on the matchup screen.
- Must not fire during Round transitions (same double-click guard logic).
- Announced via `aria-live` or screen-reader-friendly focus behavior; declared in accessible names.
- Covered by unit tests (game advance) and Playwright keyboard e2e.

## Error/empty states
Mapped 1:1 to PRD section 11 (cancel, OAuth failure, API failure, no subscriptions, one subscription, missing thumbnail, session expired, network loss).

## Acceptance linkage
Every PRD acceptance criterion (1-20) gets a trace in Phase 7; definition of done in PRD section 15.