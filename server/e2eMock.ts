import type { FastifyInstance } from "fastify";

type MockScenario =
  | "success"
  | "empty"
  | "one"
  | "api_failure"
  | "rate_limited"
  | "session_expired"
  | "refresh_once";

interface MockState {
  scenario: MockScenario;
  refreshed: boolean;
}

const mockState: MockState = { scenario: "success", refreshed: false };

function channel(id: string, title: string) {
  return {
    snippet: {
      title,
      resourceId: { channelId: id },
      thumbnails: { medium: { url: `https://mock.local/i/${id}.jpg` } },
    },
  };
}

const CHANNEL_A = channel("chan-a", "Alpha Channel");
const CHANNEL_B = channel("chan-b", "Beta Channel");
const CHANNEL_C = channel("chan-c", "Gamma Channel");

export function registerE2EMock(app: FastifyInstance): void {
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.get("/e2e/scenario", async (req) => {
    const name = (req.query as { name?: string }).name;
    if (name && (["success", "empty", "one", "api_failure", "rate_limited", "session_expired", "refresh_once"] as string[]).includes(name)) {
      mockState.scenario = name as MockScenario;
      mockState.refreshed = false;
    }
    return { ok: true, scenario: mockState.scenario };
  });

  app.post("/e2e/oauth/token", async (req) => {
    const form = new URLSearchParams(req.body as string);
    if (form.get("grant_type") === "refresh_token") {
      mockState.refreshed = true;
      return {
        access_token: "access-refreshed",
        refresh_token: "refresh-e2e",
        expires_in: 3600,
      };
    }
    return {
      access_token: "access-e2e",
      refresh_token: "refresh-e2e",
      expires_in: 3600,
    };
  });

  app.get("/e2e/yt/subscriptions", async (req, reply) => {
    const pageToken = (req.query as { pageToken?: string }).pageToken;
    switch (mockState.scenario) {
      case "empty":
        return { items: [] };
      case "one":
        return { items: [CHANNEL_A] };
      case "api_failure":
        return reply.code(500).send({ error: { message: "boom" } });
      case "rate_limited":
        return reply.code(429).send({ error: { message: "quota" } });
      case "session_expired":
        return reply.code(401).send({ error: { message: "invalid token" } });
      case "refresh_once":
        if (!mockState.refreshed) {
          return reply.code(401).send({ error: { message: "invalid token" } });
        }
        return { items: [CHANNEL_A, CHANNEL_B, CHANNEL_C] };
      case "success":
      default:
        if (pageToken === "p2") return { items: [CHANNEL_C] };
        return { items: [CHANNEL_A, CHANNEL_B], nextPageToken: "p2" };
    }
  });
}