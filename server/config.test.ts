import { describe, expect, it, vi, afterEach } from "vitest";
import { loadConfig } from "./config.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadConfig", () => {
  it("returns defaults when no environment variables are set", () => {
    for (const key of [
      "PORT",
      "BASE_URL",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "COOKIE_SECRET",
      "OAUTH_SCOPE",
      "E2E_TOKEN_ENDPOINT",
      "E2E_SUBSCRIPTIONS_ENDPOINT",
    ]) {
      delete process.env[key];
    }

    const config = loadConfig();
    expect(config).toEqual({
      port: 3001,
      baseUrl: "http://localhost:3001",
      googleClientId: "",
      googleClientSecret: "",
      cookieSecret: "dev-insecure-secret",
      oauthScope: "https://www.googleapis.com/auth/youtube.readonly",
      tokenEndpoint: undefined,
      subscriptionsEndpoint: undefined,
    });
  });

  it("reads configured values from the environment including e2e overrides", () => {
    vi.stubEnv("PORT", "4444");
    vi.stubEnv("BASE_URL", "https://faceoff.example");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("COOKIE_SECRET", "super-secret");
    vi.stubEnv("OAUTH_SCOPE", "scope-1 scope-2");
    vi.stubEnv("E2E_TOKEN_ENDPOINT", "https://fake/token");
    vi.stubEnv("E2E_SUBSCRIPTIONS_ENDPOINT", "https://fake/subs");

    const config = loadConfig();
    expect(config).toEqual({
      port: 4444,
      baseUrl: "https://faceoff.example",
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      cookieSecret: "super-secret",
      oauthScope: "scope-1 scope-2",
      tokenEndpoint: "https://fake/token",
      subscriptionsEndpoint: "https://fake/subs",
    });
  });
});