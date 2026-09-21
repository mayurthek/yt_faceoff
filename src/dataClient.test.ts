// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { usesMockData, loadSubscriptions, connectYouTube, restoreSession } from "./dataClient";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("dataClient mode switching", () => {
  it("uses mock data by default", async () => {
    expect(usesMockData()).toBe(true);
    const subs = await loadSubscriptions();
    expect(subs.length).toBeGreaterThanOrEqual(2);
    expect(subs[0]).toHaveProperty("id");
    expect(subs[0]).toHaveProperty("title");
  });

  it("uses real mode when VITE_USE_MOCK=false", () => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    expect(usesMockData()).toBe(false);
  });
});

describe("loadSubscriptions", () => {
  it("calls through to the API in real mode", async () => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/subscriptions")) {
        return Promise.resolve(
          jsonResponse(200, {
            ok: true,
            channels: [{ id: "x", title: "X", channelUrl: "c" }],
          }),
        );
      }
      return Promise.reject(new Error(`unhandled fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadSubscriptions()).resolves.toEqual([
      { id: "x", title: "X", channelUrl: "c" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/subscriptions"),
      { credentials: "same-origin" },
    );
  });

  it("propagates ApiError kinds from the API", async () => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, { ok: false, error: "session_expired", message: "nope" }),
      ),
    );
    await expect(loadSubscriptions()).rejects.toMatchObject({ kind: "session_expired" });
  });
});

describe("restoreSession", () => {
  it("returns true when authenticated in real mode", async () => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, { ok: true, authenticated: true })),
    );
    await expect(restoreSession()).resolves.toBe(true);
  });

  it("short-circuits without fetching in mock mode", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(200, { ok: true, authenticated: true }));
    vi.stubGlobal("fetch", fetchSpy);
    await expect(restoreSession()).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("connectYouTube", () => {
  it("returns true without fetching in mock mode", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(connectYouTube()).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("performs the OAuth redirect in real mode", async () => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, { ok: true, authUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=x" }),
      ),
    );
    await connectYouTube();
    expect(assign).toHaveBeenCalledWith(
      "https://accounts.google.com/o/oauth2/v2/auth?state=x",
    );
  });
});