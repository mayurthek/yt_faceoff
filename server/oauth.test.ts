import { describe, expect, it, vi } from "vitest";
import { createOAuth, OAuthError } from "./oauth.js";
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
  cookieSecret: "secret",
  oauthScope: "https://www.googleapis.com/auth/youtube.readonly",
};

const runtime = {
  authEndpoint: "https://auth.example.test",
  tokenEndpoint: "https://token.example.test",
};

describe("createOAuth", () => {
  it("buildAuthUrl includes scope, redirect, state and offline access", () => {
    const oauth = createOAuth(config, runtime);
    const url = new URL(oauth.buildAuthUrl("state-abc"));
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:5173/api/auth/callback",
    );
    expect(url.searchParams.get("scope")).toBe(
      "https://www.googleapis.com/auth/youtube.readonly",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("state-abc");
  });

  it("exchangeCode posts the expected form and returns tokens", async () => {
    const fetchImpl = vi.fn(async () => res({ access_token: "at", refresh_token: "rt", expires_in: 3600 }));
    const oauth = createOAuth(config, { ...runtime, fetchImpl });
    const tokens = await oauth.exchangeCode("the-code");

    expect(tokens).toMatchObject({ access_token: "at", refresh_token: "rt" });
    const call = fetchImpl.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(String(call[0])).toBe("https://token.example.test");
    const body = new URLSearchParams(String(call[1].body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("the-code");
    expect(body.get("client_secret")).toBe("client-secret");
  });

  it("exchangeCode maps a rejected grant to OAuthError oauth_failed", async () => {
    const fetchImpl = vi.fn(async () =>
      res({ error: "invalid_grant", error_description: "Bad code" }, 400),
    );
    const oauth = createOAuth(config, { ...runtime, fetchImpl });
    await expect(oauth.exchangeCode("bad")).rejects.toMatchObject({
      kind: "oauth_failed",
      message: "Bad code",
    });
  });

  it("refreshAccessToken returns fresh tokens", async () => {
    const fetchImpl = vi.fn(async () => res({ access_token: "new-at", expires_in: 3600 }));
    const oauth = createOAuth(config, { ...runtime, fetchImpl });
    const tokens = await oauth.refreshAccessToken("old-rt");
    expect(tokens.access_token).toBe("new-at");

    const call = fetchImpl.mock.calls[0] as unknown as [unknown, RequestInit];
    const body = new URLSearchParams(String(call[1].body));
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old-rt");
  });

  it("refreshAccessToken maps failures to OAuthError session_expired", async () => {
    const fetchImpl = vi.fn(async () =>
      res({ error: "invalid_grant", error_description: "Revoked" }, 400),
    );
    const oauth = createOAuth(config, { ...runtime, fetchImpl });
    await expect(oauth.refreshAccessToken("old-rt")).rejects.toMatchObject({
      kind: "session_expired",
    });
  });

  it("throws OAuthError oauth_failed on a network rejection", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("refused");
    });
    const oauth = createOAuth(config, { ...runtime, fetchImpl });
    await expect(oauth.exchangeCode("code")).rejects.toMatchObject({
      kind: "oauth_failed",
    });
  });

  it("OAuthError has an instanceof-friendly kind", () => {
    const err = new OAuthError("oauth_failed", "nope");
    expect(err).toBeInstanceOf(OAuthError);
    expect(err.kind).toBe("oauth_failed");
  });
});