# Face-Off

**Your YouTube subscriptions, settled by knockout.**

You subscribe to hundreds of channels and have strong feelings about almost none of
them. Face-Off puts two head to head, you pick a winner with the **Left / Right
arrow keys**, and the winner advances. Repeat until exactly one channel is left
standing.

It runs entirely on your machine, asks for **read-only** access to your
subscription list, and never writes anything to your YouTube account.

```
Landing → Connect YouTube → Round 1 → … → Final → Your Favorite Channel
```

---

## Quick start

No credentials. No Google account. No API keys. It ships with eight mock channels
and the whole tournament is playable offline.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>, click **Connect YouTube**, and start picking.

`npm run dev` runs two processes: the Fastify API server on `3001`, and the Vite
dev server on `5173` which proxies `/api` across to it.

### Requirements

- **Node.js 20+**
- npm

---

## How it plays

| | |
| --- | --- |
| **← →** | Choose the left or right channel. Works from anywhere on the page. |
| **Click** | Every card has a real button, so the mouse works too. |
| **Live bracket** | The whole ladder sits under the comparison, updating as you pick. |
| **Play Again** | Fresh shuffle of the same channels. |
| **Start Over** | Re-fetch your subscriptions without re-consenting. |

Rounds narrow as the field thins, odd counts get a bye, and a channel is never
paired against itself.

---

## Using your real subscriptions

Mock mode is the default. For your actual channel list you need Google OAuth
credentials, because `youtube.readonly` is a **sensitive** scope and Google will
not skip the consent screen for it.

1. Follow **[`docs/oauth-setup.md`](docs/oauth-setup.md)** — GCP project, enable
   the YouTube Data API v3, consent screen, OAuth client, plus a manual
   verification checklist at the end.
2. Create your env file:

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

You will hit a red **"Google hasn't verified this app"** warning. That is expected
in Google's Testing mode: click **Advanced**, then **Go to Face-Off (unsafe)**.
The word "unsafe" is Google's label, not a note about your code.

`.env.local` is gitignored. Never commit it.

### The quota reality

A full load costs roughly **1 unit per 50 subscriptions** — `subscriptions.list` is
1 unit per request, paginated at `maxResults=50`. A whole play session spends a few
dozen units against a daily allowance of 10,000. Mock mode and the e2e suite cost
**zero**. Details in [`docs/quota.md`](docs/quota.md).

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

## Under the hood

### Tokens never reach the browser

This is the part worth caring about. The client only ever holds a signed
`fo_session` cookie (`httpOnly`, `sameSite=lax`, `secure` derived from
`BASE_URL`). Access and refresh tokens sit in a server-side in-memory store with a
24-hour TTL. Restart the server and every session is gone — which is also why a
restart drops you back to the Landing screen rather than showing an error.

The OAuth `state` is generated server-side and compared on callback, so a
replayed or mismatched callback is rejected. Every response carries a strict CSP,
HSTS, `nosniff`, `X-Frame-Options: DENY`, `referrer-policy: no-referrer`, and
`permissions-policy`.

### Subscriptions

`GET /api/subscriptions` fully paginates `subscriptions.list`, then normalizes,
dedupes, and drops malformed records. Two independent token-refresh paths: a
proactive one when the token has under 30s left, and a reactive one where a `401`
triggers a single refresh and retry. Both collapse to `session_expired` if the
refresh fails.

Errors normalize into one set of kinds — `oauth_cancelled`, `oauth_failed`,
`session_expired`, `api_failure`, `network`, `no_subscriptions` — which the client
maps to a specific screen and retry action. Auth-ish kinds force a full reconnect;
everything else retries quietly.

### The game core is pure

`src/game/` is plain TypeScript with no I/O, which is why the tournament logic is
easy to test. The game object is immutable: `advance()` returns a new one and never
mutates its input.

Channels are deduped by ID and shuffled once per tournament. Odd rounds resolve
with a bye. A channel is never paired against itself. Every played match is
appended to a history log — and that log is the only thing the bracket is derived
from, so there is no second source of truth to drift out of sync.

`createAdvanceGuard()` makes a double-click a no-op by handing back the identical
object when given the same state.

### The bracket is derived, never stored

`src/bracket.ts` builds the entire ladder from game state alone. It reconstructs
each round's participants from the history, infers byes as *"participants of the
previous round that never appeared in a match"*, and labels every matchup `played`,
`bye`, `active`, `pending`, or `tbd`. Pure function, and it does not mutate the
game.

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
| Unit + integration (Vitest) | 121 | `npm test` |
| End-to-end (Playwright) | 9 | `npm run test:e2e` |

The e2e suite runs the **real** OAuth and YouTube code paths against an in-process
mock. It only stubs Google's token endpoint and `subscriptions.list`, and it
attaches a fake consent screen to the *genuine* CSRF `state` the server issued — so
pagination, token exchange, refresh, and error mapping are all really exercised
end to end.

Thresholds are enforced in `vitest.config.ts` (statements 80, branches 80, functions
85, lines 80). Current coverage: **89.47% statements**.

> **Two gotchas, both earned the hard way.**
>
> On Windows, `npm run test:coverage` can fail with `EPERM` if a previous run left
> a locked `coverage/` directory. Delete it and re-run.
>
> `npm run test:e2e` needs ports 5173 and 3001 free, and will fail outright if a
> dev server is already running.

---

## Accessibility

Treated as a hard requirement rather than a polish pass.

- Semantic HTML and real `<button>` elements throughout.
- Full keyboard operation. Left/Right arrows choose on the comparison screen.
- Accessible names on every control — `Choose Markiplier`, not "OK".
- Tournament state is **never** signalled by colour alone. Eliminated channels keep
  their `line-through` next to the reduced opacity, and the live matchup adds a
  badge as well as a colour shift.
- Every colour pair in the stylesheet was measured against WCAG 2.1. Body text
  clears 4.5:1 and control boundaries clear 3:1. Two values were darkened after
  measurement found them short.
- Dark filled controls get a two-tone focus ring, because the accent colour alone
  does not reach 3:1 against them.
- **Zero** CSS transitions and keyframes, so `prefers-reduced-motion` is satisfied
  by construction.

Lighthouse scores **1.0** for accessibility and for best practices.

---

## Design

The UI is a mid-2000s "web 2.0" skin: fixed 960px centered panel, glossy gradient
buttons, blue gradient header bar, dotted rules, and exactly one burnt-orange
accent. Nostalgic, with modern structure underneath.

**[`UI-STYLE-GUIDE.md`](UI-STYLE-GUIDE.md)** documents the whole system — tokens,
type scale, component recipes, bracket rules, responsive behaviour, the
accessibility contract, an implementation checklist, and a table of things not to
do. It is self-contained and portable to other projects.

---

## Known limitations

Stated plainly, because a README that hides them is worse than no README.

- **Mobile rendering is unverified.** The 720px media queries are written and
  correct, but nothing has rendered them at 375px. There is no mobile Playwright
  project and no viewport-emulation tooling in the loop.
- **SEO is not a goal.** Lighthouse reports 0.6 for a missing meta description and
  an invalid `robots.txt` (the SPA fallback serves `index.html` for every non-API
  route). Both are irrelevant for a localhost-only tool.
- **Sessions are in-memory.** Restart the server and you reconnect from scratch.
  Nothing is persisted, by design.
- **`server/security.ts` has no automated test.** Its headers were verified by hand.
- **One known intermittent test flake** has been observed once in roughly 30 runs
  and never reproduced. Suspect a default 1000ms `findBy*` timeout under load.

---

## Documentation

| Document | What it covers |
| --- | --- |
| [`walkthrough.md`](walkthrough.md) | Tour of every phase, what landed, and the bugs e2e caught |
| [`PLAN.md`](PLAN.md) | Implementation plan, phase log, verification history |
| [`docs/oauth-setup.md`](docs/oauth-setup.md) | Google Cloud setup, consent screen, manual checklist, troubleshooting |
| [`docs/quota.md`](docs/quota.md) | YouTube Data API quota costs and how the app stays within them |
| [`docs/prd.txt`](docs/prd.txt) | The original product requirements, extracted from the source PDF |
| [`UI-STYLE-GUIDE.md`](UI-STYLE-GUIDE.md) | The visual design system, portable to other projects |

---

## License

[MIT](LICENSE) — free to use, modify, and ship, including commercially, with
attribution. See [`LICENSE`](LICENSE) for the full text.

The one thing this project asks in return: that the privacy and security
properties described under [Under the hood](#under-the-hood) survive a fork. Keep
the read-only OAuth scope, and keep tokens server-side.
