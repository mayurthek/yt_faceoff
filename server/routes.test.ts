import { describe, expect, it, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./index.js";
import { SessionStore } from "./store.js";
import { createOAuth } from "./oauth.js";
import { createYoutube } from "./youtube.js";
import type { ServerConfig } from "./config.js";

function res(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const config: ServerConfig = {
  port: 3001,
  baseUrl: "http://localhost:5173",
  googleClientId: "client-id",
  googleClientSecret: "client-secret",
  cookieSecret: "test-secret",
  oauthScope: "https://www.googleapis.com/auth/youtube.readonly",
};

function sub(id: string, title: string) {
  return { snippet: { resourceId: { channelId: id }, title } };
}

describe("auth + subscriptions routes", () => {
  let app: FastifyInstance;
  let store: SessionStore;
  let tokenCalls: { grantType: string; refreshToken?: string }[];

  function makeYoutube(firstPageStatus = 200) {
    let first = true;
    const fetchImpl = async () => {
      if (first && firstPageStatus !== 200) {
        first = false;
        return res({ error: { code: firstPageStatus } }, firstPageStatus);
      }
      return res({
        items: [sub("a", "Alpha"), sub("b", "Beta")],
        nextPageToken: null,
      });
    };
    return createYoutube({ subscriptionsEndpoint: "https://api.example.test/subscriptions", fetchImpl });
  }

  function makeTokenFetch() {
    tokenCalls = [];
    const fetchImpl = async (_url: unknown, init: unknown) => {
      const body = new URLSearchParams(String((init as RequestInit).body));
      const grantType = body.get("grant_type") ?? "";
      tokenCalls.push({ grantType, refreshToken: body.get("refresh_token") ?? undefined });
      if (grantType === "refresh_token") {
        return res({ access_token: "new-at", refresh_token: "new-rt", expires_in: 3600 });
      }
      return res({ access_token: "at", refresh_token: "rt", expires_in: 3600 });
    };
    return createOAuth(config, {
      authEndpoint: "https://auth.example.test",
      tokenEndpoint: "https://token.example.test",
      fetchImpl,
      newState: () => "state-1",
    });
  }

  async function freshApp(firstPageStatus = 200) {
    store = new SessionStore();
    const oauth = makeTokenFetch();
    const youtube = makeYoutube(firstPageStatus);
    app = await buildServer({ config, store, oauth, youtube });
    return { oauth, youtube };
  }

  afterEach(async () => {
    await app?.close();
  });

  it("health responds ok", async () => {
    await freshApp();
    const r = await app.inject({ method: "GET", url: "/api/health" });
    expect(r.json()).toEqual({ ok: true });
  });

  it("auth status is false until a session exists", async () => {
    await freshApp();
    const before = await app.inject({ method: "GET", url: "/api/auth/status" });
    expect(before.json()).toEqual({ ok: true, authenticated: false });

    const urlRes = await app.inject({ method: "GET", url: "/api/auth/url" });
    expect(urlRes.statusCode).toBe(200);
    const body = urlRes.json();
    expect(body.authUrl).toContain("state=state-1");
    expect(urlRes.cookies.find((c) => c.name === "fo_session")).toBeTruthy();
  });

  it("union cancel callback redirects with oauth_cancelled", async () => {
    await freshApp();
    const urlRes = await app.inject({ method: "GET", url: "/api/auth/url" });
    const cookie = urlRes.cookies[0]!.value;

    const cb = await app.inject({
      method: "GET",
      url: "/api/auth/callback?error=access_denied&state=state-1",
      cookies: { fo_session: cookie },
    });
    expect(cb.statusCode).toBe(302);
    expect(String(cb.headers.location)).toContain("oauth_error=oauth_cancelled");
  });

  it("callback with mismatched state redirects with oauth_failed", async () => {
    await freshApp();
    const urlRes = await app.inject({ method: "GET", url: "/api/auth/url" });
    const cookie = urlRes.cookies[0]!.value;

    const cb = await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=abc&state=wrong-state",
      cookies: { fo_session: cookie },
    });
    expect(cb.statusCode).toBe(302);
    expect(String(cb.headers.location)).toContain("oauth_error=oauth_failed");
  });

  it("successful callback exchanges code, stores tokens and redirects", async () => {
    await freshApp();
    const urlRes = await app.inject({ method: "GET", url: "/api/auth/url" });
    const cookie = urlRes.cookies[0]!.value;

    const cb = await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=the-code&state=state-1",
      cookies: { fo_session: cookie },
    });
    expect(cb.statusCode).toBe(302);
    expect(String(cb.headers.location)).toBe(config.baseUrl);
    expect(tokenCalls[0]?.grantType).toBe("authorization_code");

    const status = await app.inject({
      method: "GET",
      url: "/api/auth/status",
      cookies: { fo_session: cookie },
    });
    expect(status.json()).toEqual({ ok: true, authenticated: true });
  });

  it("subscriptions return the happy path channels after OAuth", async () => {
    await freshApp();
    const urlRes = await app.inject({ method: "GET", url: "/api/auth/url" });
    const cookie = urlRes.cookies[0]!.value;
    await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=the-code&state=state-1",
      cookies: { fo_session: cookie },
    });

    const subs = await app.inject({
      method: "GET",
      url: "/api/subscriptions",
      cookies: { fo_session: cookie },
    });
    expect(subs.statusCode).toBe(200);
    const body = subs.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.channels)).toBe(true);
    expect(body.channels[0]).toMatchObject({ id: "a", title: "Alpha" });
  });

  it("subscriptions without a session return 401 session_expired", async () => {
    await freshApp();
    const subs = await app.inject({ method: "GET", url: "/api/subscriptions" });
    expect(subs.statusCode).toBe(401);
    expect(subs.json()).toMatchObject({ ok: false, error: "session_expired" });
  });

  it("subscriptions refresh an expired token and retry once", async () => {
    await freshApp(401);
    const urlRes = await app.inject({ method: "GET", url: "/api/auth/url" });
    const cookie = urlRes.cookies[0]!.value;
    await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=the-code&state=state-1",
      cookies: { fo_session: cookie },
    });

    const subs = await app.inject({
      method: "GET",
      url: "/api/subscriptions",
      cookies: { fo_session: cookie },
    });
    expect(subs.statusCode).toBe(200);
    expect(subs.json().ok).toBe(true);
    expect(tokenCalls.some((c) => c.grantType === "refresh_token")).toBe(true);
    expect(tokenCalls.some((c) => c.grantType === "refresh_token" && c.refreshToken === "rt")).toBe(true);
  });

  it("subscriptions with unrecoverable auth failure return 401", async () => {
    await freshApp(401);
    const urlRes = await app.inject({ method: "GET", url: "/api/auth/url" });
    const cookie = urlRes.cookies[0]!.value;
    await app.inject({
      method: "GET",
      url: "/api/auth/callback?code=the-code&state=state-1",
      cookies: { fo_session: cookie },
    });

    const brokenTokenFetch = async () => res({ error: "invalid_grant" }, 400);
    app = await buildServer({
      config,
      store,
      oauth: createOAuth(config, {
        authEndpoint: "https://auth.example.test",
        tokenEndpoint: "https://token.example.test",
        fetchImpl: brokenTokenFetch,
        newState: () => "state-1",
      }),
      youtube: makeYoutube(401),
    });

    const subs = await app.inject({
      method: "GET",
      url: "/api/subscriptions",
      cookies: { fo_session: cookie },
    });
    expect(subs.statusCode).toBe(401);
    expect(subs.json()).toMatchObject({ ok: false, error: "session_expired" });
  });
});