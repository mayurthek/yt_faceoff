# YouTube Data API quota for Face-Off

Face-Off reads your subscription list with the YouTube Data API v3
(`subscriptions.list`). Understanding quota keeps the app cheap and reliable.

## Cost model

- Google assigns each project a default quota (commonly **10,000 units/day**,
  reset daily at midnight Pacific Time).
- Every `subscriptions.list` call costs **1 unit** per request.
- Face-Off requests `maxResults=50` and follows `nextPageToken` pagination:
  a user with N subscriptions costs roughly `ceil(N / 50)` units per full load.
  A typical 400-subscription channel → 8 units per load.
- Because there is no background polling, a full manual play session costs a few
  dozen units at most.

## How Face-Off stays within quota

- **On-demand fetches only**: subscriptions are loaded after OAuth, on retry, and
  on "Start Over with Updated Subscriptions" — never polled in the background.
- **Read-only scope**: `youtube.readonly` cannot mutate anything and only costs
  against the project's quota, which is shared across anyone using your client id.
- **Server-side refresh**: expired access tokens are refreshed once and retried,
  preventing spurious repeat calls.
- **Sessions are short-lived**: subscriptions live only for the current session in
  server memory; nothing is re-fetched unless the user asks.

## If you hit the 10,000/day limit

- Check quota usage: Google Cloud Console → APIs & Services → Quotas.
- Use fewer devices per day against the same client id, or
- Submit a quota increase request (request `subscriptions.list` units) — explain
  the read-only, on-demand usage. Increases are usually straightforward.
- During heavy local dev, the **mock mode** (`VITE_USE_MOCK` unset) never touches
  the API for exercise/testing, and the Playwright suite uses the in-process e2e
  mock (`E2E_MOCK=true`) so tests cost 0 units.

## Relevant links

- [YouTube Data API quota overview](https://developers.google.com/youtube/v3/getting-started#quota)
- [YouTube Data API pushing quota](https://developers.google.com/youtube/v3/pushing_quota)
- Quota increase requests via the Google Cloud console

Follow the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
before publishing.