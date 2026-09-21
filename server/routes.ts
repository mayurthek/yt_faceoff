import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ServerConfig } from "./config.js";
import type { SessionStore } from "./store.js";
import type { OAuth } from "./oauth.js";
import type { Youtube } from "./youtube.js";
import { YoutubeError } from "./youtube.js";

export type AppContext = {
  config: ServerConfig;
  store: SessionStore;
  oauth: OAuth;
  youtube: Youtube;
};

const COOKIE_NAME = "fo_session";

function sessionId(req: FastifyRequest): string | undefined {
  return req.cookies[COOKIE_NAME];
}

function safeQuery(req: FastifyRequest): Record<string, string> {
  const raw = req.query as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
}

function redirectWithError(
  reply: FastifyReply,
  baseUrl: string,
  kind: string,
): void {
  reply.redirect(`${baseUrl}/?oauth_error=${encodeURIComponent(kind)}`);
}

export async function registerRoutes(
  app: FastifyInstance,
  ctx: AppContext,
): Promise<void> {
  const { config, store, oauth, youtube } = ctx;

  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/auth/status", async (req) => {
    const session = store.get(sessionId(req));
    const authenticated = Boolean(
      session?.accessToken && session.expiresAt && session.expiresAt > Date.now(),
    );
    return { ok: true, authenticated };
  });

  app.get("/api/auth/url", async (_req, reply) => {
    if (!config.googleClientId || !config.googleClientSecret) {
      return reply.code(500).send({
        ok: false,
        error: "oauth_failed",
        message: "OAuth is not configured on the server.",
      });
    }
    const session = store.create();
    const state = oauth.newState();
    store.update(session.id, { state });
    reply.setCookie(COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: config.baseUrl.startsWith("https://"),
    });
    return { ok: true, authUrl: oauth.buildAuthUrl(state) };
  });

  app.get("/api/auth/callback", async (req, reply) => {
    const query = safeQuery(req);
    const session = store.get(sessionId(req));

    if (query.error === "access_denied") {
      store.delete(sessionId(req));
      clearSessionCookie(reply);
      return redirectWithError(reply, config.baseUrl, "oauth_cancelled");
    }

    const stateOk = Boolean(
      session && query.state && query.state === session.state && query.code,
    );
    if (!stateOk) {
      store.delete(sessionId(req));
      clearSessionCookie(reply);
      return redirectWithError(reply, config.baseUrl, "oauth_failed");
    }

    const sessionIdValue = sessionId(req)!;
    try {
      const tokens = await oauth.exchangeCode(query.code!);
      store.update(sessionIdValue, {
        state: undefined,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      });
    } catch {
      store.delete(sessionIdValue);
      clearSessionCookie(reply);
      return redirectWithError(reply, config.baseUrl, "oauth_failed");
    }

    return reply.redirect(config.baseUrl);
  });

  app.post("/api/auth/disconnect", async (req, reply) => {
    store.delete(sessionId(req));
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/subscriptions", async (req, reply) => {
    const session = store.get(sessionId(req));
    if (!session?.accessToken) {
      return reply
        .code(401)
        .send({ ok: false, error: "session_expired", message: "Not connected." });
    }

    let accessToken = session.accessToken;
    if (session.refreshToken && session.expiresAt && session.expiresAt < Date.now() + 30_000) {
      try {
        const tokens = await oauth.refreshAccessToken(session.refreshToken);
        accessToken = tokens.access_token;
        store.update(session.id, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? session.refreshToken,
          expiresAt: Date.now() + tokens.expires_in * 1000,
        });
      } catch {
        return reply
          .code(401)
          .send({ ok: false, error: "session_expired", message: "Session expired." });
      }
    }

    try {
      const channels = await youtube.fetchAllSubscriptions(accessToken);
      return { ok: true, channels };
    } catch (error) {
      if (error instanceof YoutubeError) {
        if (error.kind === "session_expired" && session.refreshToken) {
          try {
            const tokens = await oauth.refreshAccessToken(session.refreshToken);
            const refreshed = await youtube.fetchAllSubscriptions(tokens.access_token);
            store.update(session.id, {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token ?? session.refreshToken,
              expiresAt: Date.now() + tokens.expires_in * 1000,
            });
            return { ok: true, channels: refreshed };
          } catch {
            store.delete(session.id);
            clearSessionCookie(reply);
            return reply
              .code(401)
              .send({ ok: false, error: "session_expired", message: "Session expired." });
          }
        }
        return reply.code(502).send({
          ok: false,
          error: error.kind === "network" ? "network" : "api_failure",
          message: error.message,
        });
      }
      return reply
        .code(502)
        .send({ ok: false, error: "api_failure", message: "Unknown failure." });
    }
  });
}