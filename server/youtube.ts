export interface YoutubeChannel {
  id: string;
  title: string;
  thumbnailUrl?: string;
  channelUrl: string;
}

export type YoutubeFailureKind = "api_failure" | "session_expired" | "network";

export class YoutubeError extends Error {
  kind: YoutubeFailureKind;
  retryable: boolean;

  constructor(kind: YoutubeFailureKind, message: string, retryable: boolean) {
    super(message);
    this.name = "YoutubeError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export interface YoutubeRuntime {
  subscriptionsEndpoint: string;
  fetchImpl: typeof fetch;
  pageSize: number;
}

const DEFAULT_SUBSCRIPTIONS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/subscriptions";

export function createYoutube(runtime: Partial<YoutubeRuntime> = {}) {
  const subscriptionsEndpoint =
    runtime.subscriptionsEndpoint ?? DEFAULT_SUBSCRIPTIONS_ENDPOINT;
  const fetchImpl = runtime.fetchImpl ?? fetch;
  const pageSize = runtime.pageSize ?? 50;

  async function fetchPage(
    accessToken: string,
    pageToken: string | undefined,
  ): Promise<{ items: unknown[]; nextPageToken?: string }> {
    const url = new URL(subscriptionsEndpoint);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");
    url.searchParams.set("maxResults", String(pageSize));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      throw new YoutubeError("network", "Reached YouTube failed", true);
    }

    if (response.status === 401 || response.status === 403) {
      throw new YoutubeError("session_expired", "Authorization was rejected", false);
    }
    if (response.status === 429) {
      throw new YoutubeError("api_failure", "Rate limited by YouTube", true);
    }
    if (!response.ok) {
      throw new YoutubeError(
        "api_failure",
        `YouTube API error (${response.status})`,
        true,
      );
    }

    const data = (await response.json().catch(() => ({}))) as {
      items?: unknown[];
      nextPageToken?: string | null;
    };
    return {
      items: data.items ?? [],
      nextPageToken: data.nextPageToken ?? undefined,
    };
  }

  return {
    async fetchAllSubscriptions(accessToken: string): Promise<YoutubeChannel[]> {
      const items: unknown[] = [];
      let pageToken: string | undefined;
      do {
        const page = await fetchPage(accessToken, pageToken);
        items.push(...page.items);
        pageToken = page.nextPageToken;
      } while (pageToken);
      return normalizeSubscriptions(items);
    },
  };
}

export function normalizeSubscriptions(items: readonly unknown[]): YoutubeChannel[] {
  const out: YoutubeChannel[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.snippet !== "object" || record.snippet === null) continue;
    const snippet = record.snippet as Record<string, unknown>;
    if (typeof snippet.resourceId !== "object" || snippet.resourceId === null) continue;
    const resource = snippet.resourceId as Record<string, unknown>;

    const id = resource.channelId;
    const title = snippet.title;
    if (typeof id !== "string" || id === "" || seen.has(id)) continue;
    if (typeof title !== "string" || title === "") continue;

    seen.add(id);
    let thumbnailUrl: string | undefined;
    if (typeof snippet.thumbnails === "object" && snippet.thumbnails !== null) {
      const thumbnails = snippet.thumbnails as Record<string, unknown>;
      for (const size of ["medium", "default", "high"]) {
        const entry = thumbnails[size];
        if (typeof entry === "object" && entry !== null) {
          const candidate = (entry as Record<string, unknown>).url;
          if (typeof candidate === "string" && candidate !== "") {
            thumbnailUrl = candidate;
            break;
          }
        }
      }
    }

    out.push({
      id,
      title,
      thumbnailUrl,
      channelUrl: `https://www.youtube.com/channel/${id}`,
    });
  }

  return out;
}

export type Youtube = ReturnType<typeof createYoutube>;