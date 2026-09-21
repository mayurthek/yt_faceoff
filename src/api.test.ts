// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { getSessionStatus, fetchSubscriptions, startOAuthFlow, ApiError } from "./api";
import type { Channel } from "./game/types";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function stubFetch(impl: (url: string) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => Promise.resolve(impl(String(input)))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getSessionStatus", () => {
  it("returns true when the server reports an authenticated session", async () => {
    stubFetch(() => jsonResponse(200, { ok: true, authenticated: true }));
    await expect(getSessionStatus()).resolves.toBe(true);
  });

  it("returns false when there is no session", async () => {
    stubFetch(() => jsonResponse(200, { ok: true, authenticated: false }));
    await expect(getSessionStatus()).resolves.toBe(false);
  });

  it("throws a network ApiError when the request fails to reach the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("boom");
      }),
    );
    await expect(getSessionStatus()).rejects.toMatchObject({ kind: "network" } as ApiError);
  });
});

describe("fetchSubscriptions", () => {
  const rawChannels: Channel[] = [
    {
      id: "a",
      title: "Alpha",
      thumbnailUrl: "https://i.ytimg.com/a.jpg",
      channelUrl: "https://youtube.com/channel/a",
    },
    { id: "b", title: "Beta", channelUrl: "https://youtube.com/channel/b" },
    { id: "", title: "blank id", channelUrl: "x" },
    { id: "c", title: "", channelUrl: "x" },
  ];

  it("returns sanitized channels, dropping malformed records", async () => {
    stubFetch(() => jsonResponse(200, { ok: true, channels: rawChannels }));
    const channels = await fetchSubscriptions();
    expect(channels).toEqual([
      {
        id: "a",
        title: "Alpha",
        thumbnailUrl: "https://i.ytimg.com/a.jpg",
        channelUrl: "https://youtube.com/channel/a",
      },
      { id: "b", title: "Beta", channelUrl: "https://youtube.com/channel/b" },
    ]);
  });

  it("maps a session_expired server error to the ApiError kind", async () => {
    stubFetch(() =>
      jsonResponse(401, { ok: false, error: "session_expired", message: "Not connected." }),
    );
    await expect(fetchSubscriptions()).rejects.toMatchObject({
      kind: "session_expired",
    } as ApiError);
  });

  it("maps an api_failure server error to the ApiError kind", async () => {
    stubFetch(() => jsonResponse(502, { ok: false, error: "api_failure", message: "Rate limited." }));
    await expect(fetchSubscriptions()).rejects.toMatchObject({
      kind: "api_failure",
    } as ApiError);
  });

  it("maps a network server error to the ApiError kind", async () => {
    stubFetch(() => jsonResponse(502, { ok: false, error: "network", message: "Offline." }));
    await expect(fetchSubscriptions()).rejects.toMatchObject({ kind: "network" } as ApiError);
  });

  it("throws api_failure when the response is not JSON", async () => {
    stubFetch(
      () =>
        ({ ok: true, status: 200, json: async () => Promise.reject(new Error("nope")) }) as unknown as Response,
    );
    await expect(fetchSubscriptions()).rejects.toMatchObject({
      kind: "api_failure",
    } as ApiError);
  });

  it("throws api_failure when a 2xx body carries ok:false with a known error kind", async () => {
    stubFetch(() => jsonResponse(200, { ok: false, error: "no_subscriptions", message: "None." }));
    await expect(fetchSubscriptions()).rejects.toMatchObject({
      kind: "no_subscriptions",
    } as ApiError);
  });

  it("throws a network ApiError when the request fails to reach the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("boom");
      }),
    );
    await expect(fetchSubscriptions()).rejects.toMatchObject({ kind: "network" } as ApiError);
  });
});

describe("startOAuthFlow", () => {
  it("redirects the browser to the returned Google consent URL", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign },
    });
    stubFetch(() =>
      jsonResponse(200, {
        ok: true,
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=x",
      }),
    );
    await startOAuthFlow();
    expect(assign).toHaveBeenCalledWith(
      "https://accounts.google.com/o/oauth2/v2/auth?state=x",
    );
  });

  it("throws oauth_failed when the server refuses the flow", async () => {
    stubFetch(() =>
      jsonResponse(500, { ok: false, error: "oauth_failed", message: "Not configured." }),
    );
    await expect(startOAuthFlow()).rejects.toMatchObject({ kind: "oauth_failed" } as ApiError);
  });

  it("throws a network ApiError when the request fails to reach the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("boom");
      }),
    );
    await expect(startOAuthFlow()).rejects.toMatchObject({ kind: "network" } as ApiError);
  });
});