import { describe, expect, it, vi } from "vitest";
import { createYoutube, normalizeSubscriptions, YoutubeError } from "./youtube.js";

function res(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function sub(id: string, title: string, thumb?: string) {
  return {
    snippet: {
      resourceId: { channelId: id },
      title,
      thumbnails: thumb ? { default: { url: thumb } } : undefined,
    },
  };
}

const endpoint = "https://api.example.test/subscriptions";

describe("createYoutube", () => {
  it("pagination is fully consumed until nextPageToken is gone", async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: unknown) => {
      const u = new URL(String(url));
      calls.push(u.searchParams.get("pageToken") ?? "");
      const page = u.searchParams.get("pageToken");
      if (!page) return res({ items: [sub("a", "A"), sub("b", "B")], nextPageToken: "next1" });
      if (page === "next1") return res({ items: [sub("c", "C")], nextPageToken: null });
      return res({ items: [] });
    };
    const youtube = createYoutube({ subscriptionsEndpoint: endpoint, fetchImpl });

    const channels = await youtube.fetchAllSubscriptions("tok");
    expect(channels.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(calls).toEqual(["", "next1"]);
  });

  it("sends mine=true and the bearer token as Authorization", async () => {
    const fetchImpl = vi.fn(async () => res({ items: [] }));
    const youtube = createYoutube({ subscriptionsEndpoint: endpoint, fetchImpl });
    await youtube.fetchAllSubscriptions("access-token");

    const call = fetchImpl.mock.calls[0] as unknown as [unknown, RequestInit];
    const u = new URL(String(call[0]));
    expect(u.searchParams.get("mine")).toBe("true");
    expect(u.searchParams.get("part")).toBe("snippet");
    const headers = (call[1].headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-token");
  });

  it("maps 401 to session_expired and not retryable", async () => {
    const fetchImpl = async () => res({ error: { code: 401 } }, 401);
    const youtube = createYoutube({ subscriptionsEndpoint: endpoint, fetchImpl });
    await expect(youtube.fetchAllSubscriptions("t")).rejects.toMatchObject({
      kind: "session_expired",
      retryable: false,
    });
  });

  it("maps 429 to api_failure and retryable", async () => {
    const fetchImpl = async () => res({ error: { code: 429 } }, 429);
    const youtube = createYoutube({ subscriptionsEndpoint: endpoint, fetchImpl });
    await expect(youtube.fetchAllSubscriptions("t")).rejects.toMatchObject({
      kind: "api_failure",
      retryable: true,
    });
  });

  it("maps server errors to api_failure", async () => {
    const fetchImpl = async () => res({ error: { code: 500 } }, 500);
    const youtube = createYoutube({ subscriptionsEndpoint: endpoint, fetchImpl });
    await expect(youtube.fetchAllSubscriptions("t")).rejects.toMatchObject({
      kind: "api_failure",
    });
  });

  it("maps a network rejection to network error", async () => {
    const fetchImpl = async () => {
      throw new Error("ECONNREFUSED");
    };
    const youtube = createYoutube({ subscriptionsEndpoint: endpoint, fetchImpl });
    await expect(youtube.fetchAllSubscriptions("t")).rejects.toMatchObject({
      kind: "network",
      retryable: true,
    });
  });

  it("throws typed YoutubeError", () => {
    const err = new YoutubeError("network", "boom", true);
    expect(err).toBeInstanceOf(YoutubeError);
    expect(err.retryable).toBe(true);
  });
});

describe("normalizeSubscriptions", () => {
  it("extracts channels and derives the channel url", () => {
    const items = [
      sub("a", "Alpha", "https://x/thumb.jpg"),
      sub("b", "Beta"),
      { snippet: { resourceId: {}, title: "no id" } },
      null,
      42,
      "junk",
    ];
    const out = normalizeSubscriptions(items);
    expect(out).toEqual([
      {
        id: "a",
        title: "Alpha",
        thumbnailUrl: "https://x/thumb.jpg",
        channelUrl: "https://www.youtube.com/channel/a",
      },
      {
        id: "b",
        title: "Beta",
        channelUrl: "https://www.youtube.com/channel/b",
      },
    ]);
  });

  it("drops duplicates by channel id", () => {
    const out = normalizeSubscriptions([sub("a", "First"), sub("a", "Second")]);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("First");
  });

  it("prefers medium thumbnails over default and high", () => {
    const item = {
      snippet: {
        resourceId: { channelId: "a" },
        title: "A",
        thumbnails: {
          default: { url: "https://x/default" },
          medium: { url: "https://x/medium" },
          high: { url: "https://x/high" },
        },
      },
    };
    const [channel] = normalizeSubscriptions([item]);
    expect(channel?.thumbnailUrl).toBe("https://x/medium");
  });
});