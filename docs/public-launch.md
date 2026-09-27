# Public Launch Guide

Ordered plan for taking Face-Off from a local app to a public, policy-compliant
deployment on your own domain.

Everything here is grounded in Google's current documentation. The two things
that will hurt you if you get them wrong are marked ⚠️ — one is irreversible.

**Legend:** 🔧 = I do this (code) · 👤 = you do this (accounts, domain, video)

---

## ⚠️ Read this before starting

**The 100-user cap is permanent.** Unverified apps using sensitive scopes get a
100-new-user cap that *"applies over the entire lifetime of the project, and it
cannot be reset or changed."* Exhaust it and Google disables sign-in for that
project, for good.

Your current project `faceoff-509919` has already been used for real sign-ins.
**Do not launch from it.** Create a fresh project. This is the one irreversible
mistake available to you, so make it step 1.

---

## Phase 1 — Production Google Cloud project 👤

Do this before anything else. It takes 20 minutes and nothing else matters until
it exists.

1. <https://console.cloud.google.com/> → project picker → **New Project**
   - Name: `faceoff-prod`
   - **Do not** reuse or link to `faceoff-509919`
2. **APIs & Services → Library** → search `YouTube Data API v3` → **Enable**
3. **APIs & Services → Google Auth Platform → Branding**
   - App name: `Face-Off`
   - Homepage: `https://yourdomain.com` (you may not have it yet — come back)
   - App logo: `assets/logo.svg`, exported to 512×512 PNG
   - Support + developer contact email
4. **Audience**
   - User type: **External**
   - Publishing status: **In production** ⚠️ this activates the cap — only do it
     once you are ready to submit for verification
5. **Data access** → add `https://www.googleapis.com/auth/youtube.readonly`
6. **Clients → Create client → Web application**
   - Authorized redirect URI, exact, no trailing slash:
     ```
     https://yourdomain.com/api/auth/callback
     ```

**Done when:** a production project exists with the API enabled and a Web client
whose redirect URI points at your future domain.

---

## Phase 2 — Code changes for production 🔧

I need a decision from you on the first one.

### 2a. Sessions (needs your call)

Today `SessionStore` is an in-memory `Map`. That is fine locally and **breaks in
production** — a restart wipes every session, and multiple instances don't share
one. Two options:

| Option | Keeps "tokens never reach the browser" | Needs |
|---|---|---|
| **Single instance + sticky sessions** | ✅ yes | A host with one instance |
| Redis / persistent store | ✅ yes | A Redis instance, ~$0–7/mo |
| Encrypted cookie | ❌ no — ciphertext lives in the browser | Nothing |

I'd recommend **single instance + sticky sessions**. It keeps the security
property that the README and privacy page both claim, and it's the smallest
change.

### 2b. Cap the subscription fetch

Right now every user loads their *entire* subscription list. A user with 800
subscriptions costs 16 units per load. Capping at ~200 channels cuts worst-case
quota roughly 4× and makes a 1,000-user day fit inside 10,000 units.

The tournament works identically — 8 channels is plenty to fill a bracket.

### 2c. Limited Use disclosure

Google's FAQ gives the exact wording they look for. Add to `/privacy`:

> Face-Off's use of information received from Google APIs will adhere to the
> Google API Services User Data Policy, including the Limited Use requirements.

### 2d. Google-branded sign-in button

Your button currently reads "Connect YouTube" in a custom style. Brand
verification requires that any control initiating a Google grant follows Google's
branding guidelines. Swap in the official **Sign in with Google** asset from
<https://developers.google.com/identity/branding-guidelines>.

### 2e. Privacy policy on a stable URL

`/privacy` is currently an SPA route. It works, but the policy must be reachable
at a URL that matches what you put in the consent screen. Confirm your host
serves it (the existing SPA fallback should).

**Done when:** all five are done, tests pass, and the build deploys.

---

## Phase 3 — Domain and hosting 👤

1. **Buy a domain** — ~$10–15/year (Cloudflare Registrar is cheapest, no markup)
2. **Deploy** the built app
   - `npm run build` → serve `dist/` from Fastify
   - Must be a **single instance** unless you chose Redis
   - Env vars in the host's dashboard: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
     `BASE_URL=https://yourdomain.com`, `COOKIE_SECRET`, `PORT`,
     `VITE_USE_MOCK=false`
   - 🔑 `COOKIE_SECRET` is generated at build time for the *client*; the server
     needs the same one
3. **HTTPS** — mandatory. Most hosts provision a cert automatically
4. **Point your Google client's redirect URI** at the live URL if it differs

**Done when:** `https://yourdomain.com` loads the app and the OAuth round trip
works end to end in production.

---

## Phase 4 — Verification submission 👤

Roughly 10 business days for a sensitive-scope review. **No fee.**

### 4a. Verify domain ownership
- Add the domain to **Google Search Console**
- Verify ownership with a project owner account
- Add the domain to **Authorized domains** in the consent screen

### 4b. Privacy policy compliance
- Hosted on the **same domain** as the homepage ✅
- Linked **from the homepage** ✅ (`/privacy` already is)
- Linked **from the OAuth consent screen**, and it must be the **same URL**
- Must disclose how you access, use, store, and share Google user data — your
  existing copy already does, plus the Limited Use line from 2c

### 4c. Record the demo video ⚠️
Google's requirements are specific:
- End-to-end flow **including the OAuth grant**
- The **same app you submitted** — same name, same branding
- The **complete consent screen**, showing your **exact scopes**
- Consent screen language toggle set to **English**
- Must demonstrate the feature the scope enables (the tournament)

### 4d. Scope justification
Short written answer: *why `youtube.readonly`, and why no narrower scope works.*
Narrower is not available — it is the only scope that returns a user's
subscription list. Be specific about what breaks without it.

### 4e. Submit
Google Auth Platform → Data access → select the scope → **Submit for
verification**.

**Done when:** Google issues approval and the unverified warning disappears for
new users.

---

## Phase 5 — Launch 👤

1. Confirm the consent screen no longer shows the unverified warning
2. Publish the repo / announce it
3. Watch the **Quotas** page in the Cloud console on day one
   - <https://console.cloud.google.com/iam-admin/quotas>
4. If you exceed 10,000 units: users see errors until midnight Pacific. You are
   **not charged** — raise the cap instead

---

## Cost summary

| Item | Cost |
|---|---|
| OAuth verification | **$0** |
| Security assessment | **$0** — sensitive scopes don't need one |
| YouTube API quota (10k units/day) | **$0** |
| Domain | ~$10–15 / year |
| Hosting | ~$5–25 / month |

YouTube Data API quota is a hard allocation, not a metered product. Exceeding it
returns errors — it never bills you.

---

## Rollback

Nothing here is destructive to your dev setup. Your local project and the
`faceoff-509919` project stay exactly as they are. If verification is rejected,
you can fix and resubmit; rejected apps simply lose access to the unapproved
scopes until you do.

---

## Open items

- [ ] 2a — session strategy decision
- [ ] Phase 1 — production project created
- [ ] Phase 2 — code changes
- [ ] Phase 3 — domain + hosting
- [ ] Phase 4a–4d — Search Console, privacy, video, justification
- [ ] Phase 4e — submitted
- [ ] Phase 5 — launched

---

*Requirements verified against Google's OAuth App Verification Help Center and
YouTube Data API quota documentation, September 2026. Google may change these
policies; re-check before submitting.*
