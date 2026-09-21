# Local OAuth setup for Google (dev environment)

Face-Off uses the Google OAuth 2.0 **web-server flow** with the **read-only**
`https://www.googleapis.com/auth/youtube.readonly` scope. Tokens are exchanged and
held server-side only; they are never exposed to the browser.

## 1. Create a Google Cloud project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `faceoff`).
3. Enable the **YouTube Data API v3**:
   - APIs & Services → Library → search "YouTube Data API v3" → Enable.

## 2. Configure the OAuth consent screen

1. APIs & Services → **OAuth consent screen**.
2. User type: **External** (required for `youtube.readonly`).
3. Fill in the app name, support email, and developer contact email.
4. Scopes: add **`.../auth/youtube.readonly`** (View YouTube account metadata).
   It belongs to the "Limited" sensitive category.
5. **Test users**: add the Google account you will log in with. You do **not**
   need Google's app verification for local development; the app runs in
   "Testing" mode and you'll see a "Google hasn't verified this app" warning once,
   which is expected.
6. Publishing status: **Testing** (fine for local use).

## 3. Create OAuth client credentials

1. APIs & Services → **Credentials** → Create credentials → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** — add exactly:
   ```
   http://localhost:5173/api/auth/callback
   ```
   This must match `BASE_URL + "/api/auth/callback"` precisely (scheme, host,
   port, path). You do not need Authorized JavaScript origins.
4. Copy the **Client ID** and **Client secret**.

## 4. Fill .env.local

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
BASE_URL=http://localhost:5173
COOKIE_SECRET=<32+ random bytes, hex>
VITE_USE_MOCK=false
```

Generate the cookie secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Run the real flow

```bash
npm run dev
# open http://localhost:5173, click Connect YouTube, approve the consent screen
```

## Manual verification checklist

- [ ] Consent screen loads from `accounts.google.com` with the read-only scope
      named and no write scopes.
- [ ] Granting access lands on the Ready screen with your subscriptions.
- [ ] Denying access shows the "cancelled" error with Try Again.
- [ ] After restarting the server, the app shows "Reconnect YouTube", not a
      broken state.
- [ ] `/privacy` is reachable from the Landing screen.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `redirect_uri_mismatch` | Authorized redirect URI in Google differs from `BASE_URL/api/auth/callback`. |
| `Error 403: access_denied` or "app not verified" | Expected in Testing mode; use a test user account. |
| OAuth round-trip fails with state error | Restart leaving the old tab's session behind; the CSRF state is single-use per session. Reload from `/`. |
| `401 invalid_grant` on Refresh | Access was revoked or credentials changed; reconnect via the error screen. |
| Quota exceeded | See `docs/quota.md`. |