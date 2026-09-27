# Face-Off — Walkthrough

Everything that has been built, what actually landed, how to run it, and how to
finish the real YouTube OAuth flow.

---

## 1. What this is

**YouTube Subscribed Channels Face-Off**: a local web app that reads your YouTube
subscriptions (read-only), brackets them into head-to-head matchups, and lets you
pick one favorite channel by clicking or using the **Left / Right arrow keys**.
Built against the PRD (`docs/prd.txt`) and tracked in `PLAN.md`.

Stack: Node 20 + Vite 6 + React 19 + TypeScript, Fastify 5 server, plain CSS, Vitest
(unit/integration), Playwright (e2e against an in-process mock).

**Look and feel:** a mid-2000s "web 2.0" skin — fixed 960px centered panel, glossy
gradient buttons, blue gradient header bar, Verdana/Trebuchet type, dotted rules,
one burnt-orange accent. Nostalgic, but the structure underneath is fully semantic
and accessible. The full spec lives in `UI-STYLE-GUIDE.md`.

---

## 2. What has landed (all phases complete)

### Phase 1 — Scaffold ✅
Vite + React + TS app, Fastify server, env config, scripts (`dev`, `build`, `start`,
`typecheck`, `test`), `.gitignore` / `.env.example`.

### Phase 2 — Game core (pure, fully tested) ✅
`src/game/game.ts`: dedupe by channel id, shuffle once per game, left-right pairing,
bye handling for odd rounds, double-click guard, Play Again reset + reshuffle,
malformed-record sanitizing. 17 unit tests.

### Phase 3 — UI (mock data) ✅
Screens Landing, Connecting, Ready, Matchup, Result, ErrorScreen; empty /
single-channel states; **keyboard arrows + visible focus + accessible
`Choose <channel>` names**; `src/api.ts` typed fetch wrapper + `ApiError` kinds;
`src/mock.ts`; reduced-motion + contrast. (Visual styling was originally plain
white/black and was later replaced — see the 2000s reskin section below.)

### Phase 4 — OAuth layer ✅
`/api/auth/url`, `/api/auth/callback`, `/api/auth/status`, `/api/auth/disconnect`;
signed HttpOnly `fo_session` cookie; CSRF state stored server-side; injectable OAuth
runtime for tests. Tokens **never leave the server**.

### Phase 5 — YouTube service layer ✅
Full pagination of `subscriptions.list` (`maxResults=50`), normalization
(medium > default > high thumbnails, dedupe, malformed skip), error mapping
(401/403 → server-side refresh + retry once → session_expired; 429/5xx →
api_failure; transport → network).

### Phase 6 — Integration ✅
`src/dataClient.ts` lazily switches mock vs real (`VITE_USE_MOCK`, default mock).
App boots by restoring the session; auth errors route to full reconnect, others to
a quiet reload; Start Over reloads without re-auth; `?oauth_error` handled.
Client integration tests in `src/integration.test.tsx`.

### Phase 7 — E2E ✅
Playwright suite (`playwright/faceoff.spec.ts`) with an in-process mock
(`server/e2eMock.ts`, active only when `E2E_MOCK=true`). The app runs in real mode
via `npm run dev:e2e` with mocked Google/YouTube:
OAuth success with pagination + full keyboard play-through + Play Again + Start Over,
mouse clicks, deny-cancel error, single / empty states, API-failure retry,
expired-session reconnect, silent access-token refresh.

**Bugs e2e caught and fixed:**
- React dev double-invoking state updaters broke the advance guard (now reads a
  ref outside the updater) — `src/App.tsx`.
- `?oauth_error=oauth_cancelled` now maps to the cancelled screen (was `oauth_failed`).
- Zero/one-channel “Refresh” correctly drives a reconnect.

### Phase 8 — Release hardening (local) ✅
- **Privacy page** at `/privacy`, linked from the Landing screen, unit-tested.
- **Security headers** on every server response: CSP (allows `i.ytimg.com`
  thumbnails, `frame-ancestors 'none'`), HSTS, `nosniff`, `X-Frame-Options: DENY`,
  `referrer-policy: no-referrer`, `permissions-policy`.
- **Docs**: `docs/oauth-setup.md` (Google Cloud setup + consent screen + manual
  checklist), `docs/quota.md` (YouTube API quota).

### Tournament bracket UI ✅
- Single-elimination bracket on the comparison (Matchup) screen and Result screen as
  a purely visual track — decisions still happen on the comparison screen.
- Game core records a `history: PlayedMatch[]` (round, left, right, winner) and
  channels carry an optional `subscriberCount`; `src/game/{types,game}.ts`.
- Pure builder `src/bracket.ts` derives rounds (Final/Semifinals/Quarterfinals/Round N),
  byes, and per-match states (`played | bye | active | pending | tbd`) from game state
  without mutating it.
- `src/screens/Bracket.tsx` renders round columns with connector lines, avatar/name/
  subscriber-count cards, a VS badge on the active matchup, won/lost styling, TBD
  placeholders, a highlighted Final, and a champion band. Plain CSS in `styles.css`
  with horizontal scroll on mobile.

### 2000s UI reskin ✅
- The plain white/black look was replaced with a mid-2000s "web 2.0" skin across
  **all** screens and the bracket. Visual only — every ARIA role, accessible name,
  `role="status"`, and the arrow-key handler are untouched.
- `styles.css` is now token-driven (`:root`): fixed 960px page panel on a pale-blue
  gradient, hard `3px 3px 0` offset shadow, white inner bevel, full-bleed blue
  gradient header bar, Verdana 13px / Trebuchet MS, 3-stop gloss buttons at 4px
  radius, dotted rules under headings, diagonal-stripe image placeholders.
- The header bar is styled from the existing `.wordmark` element via a negative
  margin, so all seven screens gained the chrome without JSX changes. A new
  `src/screens/Footer.tsx` adds the "best viewed at 1024x768" bar, wrapped by
  `.page` in `App.tsx` and `Privacy.tsx`.
- Bracket re-skinned: gloss slots, gold `★ FINAL` tab, orange wash on the live
  matchup, orange VS pill, dotted bye slots, gold champion badge.
- **Four accessibility defects were found and fixed** while porting the look, each
  verified by measurement rather than assumption:
  - `aria-label` sat on role-less `<div>`/`<span>` elements (a prohibited ARIA
    attribute) → added `role="group"` and `role="img"`. Lighthouse 0.95 → **1.0**.
  - Accent `#cc5500` was **4.31:1** on white (below AA 4.5) → `#b34700`, now 5.50:1.
  - Border `#7b9cbf` was **2.86:1** (below the 3:1 minimum for UI boundaries) →
    `#5f81a4`, now 4.07:1.
  - The accent focus ring was **1.24:1** against the dark blue primary button →
    added a two-tone ring (white against the fill, accent against the page).
- There are no `transition` or `@keyframes` anywhere, so `prefers-reduced-motion` is
  satisfied by construction. Losers keep their `line-through`, so state is never
  communicated by color alone.
- `UI-STYLE-GUIDE.md` documents the whole system (tokens, type scale, component
  recipes, bracket rules, responsive rules, a11y contract, a checklist, and an
  anti-pattern list) for reuse on other projects. All 14 contrast pairs in it are
  measured.
- Not verified: 375px mobile rendering (no viewport-emulation tool was available) and
  SEO 0.6 (a pre-existing missing meta description and invalid `robots.txt`, both
  irrelevant for a localhost-only tool).

---

## 3. Current verification status

| Check | Result |
| --- | --- |
| Unit + integration tests (`npm test`) | 121/121 pass |
| TypeScript (`npm run typecheck`) | 0 errors |
| Production build (`npm run build`) | OK |
| Coverage (`npm run test:coverage`) | 89.47% statements, above thresholds |
| Playwright e2e (`npm run test:e2e`) | 9/9 pass |
| Prod smoke (server: `/`, `/privacy`, headers) | 200 + security headers |
| Lighthouse accessibility (2000s skin) | 1.0 |
| Lighthouse best practices | 1.0 |

---

## 4. How to run everything

### Mock mode (no Google credentials — default)
```bash
npm run dev
# open http://localhost:5173
```
`VITE_USE_MOCK` is unset → the app uses built-in mock subscriptions so the whole
game is playable offline.

### Tests
```bash
npm test          # unit + integration (121)
npm run typecheck
npm run build
npm run test:coverage  # coverage thresholds (statements 80, branches 80, funcs 85, lines 80)
npm run test:e2e  # Playwright with mocked Google/YouTube (9)
```

---

## 5. The finish: real YouTube OAuth flow

The code, tests, and docs are all done; the only thing left is a one-time manual
run against Google on your machine.

### 5.1 Create Google credentials
Follow `docs/oauth-setup.md` step by step. Summary:
1. Google Cloud Console → new project.
2. Enable **YouTube Data API v3**.
3. **OAuth consent screen**: External, add scope `.../auth/youtube.readonly`,
   add a test user (you).
4. **Credentials → OAuth client ID → Web application**; authorized redirect URI
   exactly:
   ```
   http://localhost:5173/api/auth/callback
   ```
5. Copy Client ID / Secret.

### 5.2 Configure the app locally
```bash
cp .env.example .env.local
# edit .env.local:
#   GOOGLE_CLIENT_ID=...
#   GOOGLE_CLIENT_SECRET=...
#   BASE_URL=http://localhost:5173
#   COOKIE_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
#   VITE_USE_MOCK=false
```

### 5.3 Run and verify
```bash
npm run dev
# open http://localhost:5173
```
Work through the checklist in `docs/oauth-setup.md`:

- [ ] Consent screen loads with read-only scope only, no write scopes.
- [ ] **Grant** → Ready screen lists your real subscriptions.
- [ ] **Deny** → “YouTube access was cancelled.” with Try Again.
- [ ] Restart the server (`Ctrl+C`, `npm run dev`) → app returns to the Landing
      screen with “Connect YouTube”. Sessions live only in server memory, so
      this happens by design and is a clean start, not a broken state.
- [ ] Start a face-off, use arrow keys + mouse, Play Again, Start Over → result.
- [ ] `/privacy` reachable from Landing.

One-time launch note: since the app is in Google's “Testing” state, you'll see
“Google hasn't verified this app” once — expected for local dev.

---

## 6. Optional next steps after the real flow works

- A `release` hardening review per `docs/quota.md` and the Google API Services User
  Data Policy (PRD §11).
- If publishing, the consent screen would need Google App Verification and any
  future work stays in `docs/oauth-setup.md`.
