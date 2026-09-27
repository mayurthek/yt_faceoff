# Face-Off

Find your favorite YouTube channel by pitting the channels you subscribe to
against each other in a single-elimination tournament. Click a channel or use the
**Left / Right arrow keys** to advance the winner until one channel is left.

Runs entirely on your machine. Requests only **read-only** access to your
subscription list and never writes to your YouTube account.

```
Landing  ->  Connect YouTube  ->  Round 1  ->  ...  ->  Final  ->  Your Favorite Channel
```

---

## Quick start

No credentials needed. The app ships with eight mock subscriptions and the whole
tournament is playable offline.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

`npm run dev` starts two processes: the Fastify API server on `3001` and the Vite
dev server on `5173`, which proxies `/api` to the server.

### Requirements

- **Node.js 20+**
- npm

---

## Using real YouTube subscriptions

Mock mode is the default. To read your actual subscriptions you need Google OAuth
credentials, because `youtube.readonly` is a sensitive scope.

1. Follow **[`docs/oauth-setup.md`](docs/oauth-setup.md)** — it walks through the GCP
   project, enabling the YouTube Data API v3, the consent screen, and creating the
   OAuth client. There is also a manual verification checklist at the end.
2. Create your local env file:

   ```bash
   cp .env.example .env.local
   ```

   Then fill in:

   ```bash
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   BASE_URL=http://localhost:5173
   COOKIE_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   VITE_USE_MOCK=false
   ```

3. `npm run dev`, click **Connect YouTube**, and grant access.

`.env.local` is gitignored. Never commit it.

> The app is still in Google's "Testing" publishing state, so you will see
> "Google hasn't verified this app" once. That is expected for local development.

### About the YouTube API quota

A full load costs about **1 unit per 50 subscriptions** (`subscriptions.list` is
1 unit per request, paginated at `maxResults=50`). A typical session spends a few
dozen units against a daily allowance of 10,000. Mock mode and the e2e suite cost
**zero** units. See [`docs/quota.md`](docs/quota.md).

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Fastify server + Vite dev server together |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` for the app and the server |
| `npm test` | Vitest unit + integration suite |
| `npm run test:watch` | The same suite in watch mode |
| `npm run test:coverage` | Coverage report with enforced thresholds |
| `npm run test:e2e` | Playwright suite against a mocked Google/YouTube |
| `npm run dev:e2e` | Dev servers wired for the e2e suite |
| `npm start` | Serve the built `dist/` from Fastify |
| `npm run preview` | Vite's own preview server |

---

## How it works

### Security model

The important property: **Google tokens never reach the browser.**

- The client only ever holds a signed `fo_session` cookie (`httpOnly`,
  `sameSite=lax`, `secure` derived from `BASE_URL`).
- Access and refresh tokens live in a server-side in-memory `SessionStore` with a
  24-hour TTL. Restarting the server drops every session.
- The OAuth `state` is generated server-side and compared on the callback, so a
  mismatched or replayed callback is rejected.
- Every response carries a strict CSP, HSTS, `nosniff`, `X-Frame-Options: DENY`,
  `referrer-policy: no-referrer`, and `permissions-policy`.

### Subscriptions

`GET /api/subscriptions` fully paginates `subscriptions.list`, then normalizes,
dedupes, and drops malformed records. It has two independent token-refresh paths:

- **Proactive** — refreshes when the token has under 30s left.
- **Reactive** — a `401` from YouTube triggers one refresh and one retry.

Both collapse to `session_expired` if the refresh fails.

Errors are normalized into a single set of kinds —
`oauth_cancelled`, `oauth_failed`, `session_expired`, `api_failure`, `network`,
`no_subscriptions` — which the client maps to a specific screen and retry action.
Auth-ish kinds force a full reconnect round-trip; everything else retries without
re-consenting.

### Game core

`src/game/` is pure TypeScript with no I/O, which is why the tournament logic is
straightforwardly testable. The game object is immutable — `advance()` returns a new
object and never mutates its input.

- Channels are deduplicated by ID and shuffled once per tournament.
- Odd rounds resolve with a bye.
- A channel is never paired against itself.
- Every played match is appended to a `history` log, which is what the bracket view
  is derived from.
- `createAdvanceGuard()` makes a double-click a no-op by returning the identical
  object when handed the same state.

### Bracket

`src/bracket.ts` derives the whole ladder from game state alone — no separate
bracket state to keep in sync. It reconstructs each round's participants from the
history, infers byes as "participants of the previous round that never appeared in
a match", and labels each matchup as `played`, `bye`, `active`, `pending`, or
`tbd`. It is a pure function and does not mutate the game.

The bracket renders on both the comparison screen and the result screen. It is a
visual representation only — you always make your actual choice on the comparison
screen.

---

## Project structure

```
faceoff/
|- server/                 Fastify backend
|  |- index.ts             bootstrap, static serving, SPA fallback
|  |- routes.ts            /api/* route handlers
|  |- oauth.ts             auth URL, code exchange, token refresh
|  |- youtube.ts           paginated subscriptions.list + normalization
|  |- store.ts             in-memory session/token store
|  |- security.ts          response security headers
|  |- config.ts            env loading
|  |- e2eMock.ts           /e2e/* stand-ins for Google + YouTube
|- src/                    React frontend
|  |- App.tsx              screen state machine
|  |- api.ts               typed fetch wrapper + ApiError
|  |- dataClient.ts        mock vs real mode switching
|  |- bracket.ts           pure bracket model builder
|  |- mock.ts              offline mock subscriptions
|  |- game/                pure tournament logic
|  |- screens/             Landing, Connecting, Ready, Matchup, Result, Error
|  |- Privacy.tsx          /privacy page
|  |- styles.css           the entire stylesheet
|- playwright/             e2e specs
|- docs/                   OAuth setup, quota notes, extracted PRD
|- PLAN.md                 implementation plan and phase log
|- walkthrough.md          long-form tour of what was built
|- UI-STYLE-GUIDE.md       the design system, portable to other projects
```

---

## Testing

| Suite | Count | Command |
| --- | --- | --- |
| Unit + integration (Vitest) | 120 | `npm test` |
| End-to-end (Playwright) | 9 | `npm run test:e2e` |

The e2e suite runs the **real** OAuth and YouTube code paths against an in-process
mock — it only stubs Google's token endpoint and `subscriptions.list`, and it
attaches a fake consent screen to the genuine CSRF `state` the server issued. So
pagination, token exchange, token refresh, and error mapping are all genuinely
exercised end to end.

Coverage thresholds are enforced in `vitest.config.ts` (statements 80, branches 80,
functions 85, lines 80). Current coverage is **89.47% statements**.

> **Windows note:** `npm run test:coverage` can fail with `EPERM` if a previous run
> left a locked `coverage/` directory. Delete `coverage/` and re-run.
>
> `npm run test:e2e` needs ports 5173 and 3001 free, and will fail if a dev server
> is already running.

---

## Accessibility

Treated as a hard requirement, not a polish pass.

- Semantic HTML and real `<button>` elements throughout.
- Full keyboard operation. Left/Right arrows choose on the comparison screen.
- Accessible names on every control, e.g. `Choose Markiplier`.
- Tournament state is **never** signalled by color alone — eliminated channels
  keep their `line-through` alongside reduced opacity, and the live matchup adds a
  badge as well as a color shift.
- Every color pair in the stylesheet was measured against WCAG 2.1; body text is
  at least 4.5:1 and control boundaries at least 3:1. Two values were darkened
  after measurement found them short.
- Dark filled controls get a two-tone focus ring, because the accent color alone
  does not reach 3:1 against them.
- There are **no** CSS transitions or keyframes anywhere, so
  `prefers-reduced-motion` is satisfied by construction.

Lighthouse scores **1.0** for accessibility and best practices.

---

## Design

The UI is a mid-2000s "web 2.0" skin — fixed 960px centered panel, glossy gradient
buttons, blue gradient header bar, dotted rules, and one burnt-orange accent. See
**[`UI-STYLE-GUIDE.md`](UI-STYLE-GUIDE.md)** for the full system: tokens, type
scale, component recipes, bracket rules, responsive behavior, and the
accessibility contract. It is self-contained and portable to other projects.

---

## Known limitations

- **The real Google OAuth flow has not been verified end to end against Google's
  servers.** The code, tests, and docs are complete, but someone with credentials
  needs to run the manual checklist in `docs/oauth-setup.md` once.
- **Mobile rendering is unverified.** The 720px media queries are written and
  correct, but nothing has exercised them at 375px — there is no mobile Playwright
  project and no viewport-emulation tooling in the loop.
- **SEO is not a goal.** Lighthouse reports 0.6 for a missing meta description and
  an invalid `robots.txt` (the SPA fallback serves `index.html` for every
  non-API route). Both are irrelevant for a localhost-only tool.
- Sessions are in-memory, so every server restart requires reconnecting.
- `server/security.ts` has no automated test; its headers were verified by manual
  inspection only.

---

## Documentation

| Document | What it covers |
| --- | --- |
| [`walkthrough.md`](walkthrough.md) | Tour of every phase, what landed, and the bugs e2e caught |
| [`PLAN.md`](PLAN.md) | Implementation plan, phase log, and verification history |
| [`docs/oauth-setup.md`](docs/oauth-setup.md) | Google Cloud setup, consent screen, manual checklist, troubleshooting |
| [`docs/quota.md`](docs/quota.md) | YouTube Data API quota costs and how the app stays within them |
| [`docs/prd.txt`](docs/prd.txt) | The original product requirements, extracted from the source PDF |
| [`UI-STYLE-GUIDE.md`](UI-STYLE-GUIDE.md) | The visual design system, portable to other projects |
