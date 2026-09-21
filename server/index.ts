import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig, type ServerConfig } from "./config.js";
import { registerRoutes, type AppContext } from "./routes.js";
import { SessionStore } from "./store.js";
import { createOAuth, type OAuth } from "./oauth.js";
import { createYoutube, type Youtube } from "./youtube.js";
import { registerE2EMock } from "./e2eMock.js";
import { applySecurityHeaders } from "./security.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "..", "dist");

export interface ServerDeps {
  config?: ServerConfig;
  store?: SessionStore;
  oauth?: OAuth;
  youtube?: Youtube;
}

export async function buildServer(
  deps: ServerDeps = {},
): Promise<FastifyInstance> {
  const config = deps.config ?? loadConfig();
  const store = deps.store ?? new SessionStore();
  const oauth =
    deps.oauth ??
    createOAuth(config, { tokenEndpoint: config.tokenEndpoint });
  const youtube =
    deps.youtube ??
    createYoutube({ subscriptionsEndpoint: config.subscriptionsEndpoint });

  const app = Fastify({ logger: deps.config === undefined });

  await app.register(cookie, { secret: config.cookieSecret });

  if (existsSync(DIST_DIR)) {
    await app.register(fastifyStatic, {
      root: DIST_DIR,
      prefix: "/",
    });
  }

  const ctx: AppContext = { config, store, oauth, youtube };
  await registerRoutes(app, ctx);

  if (process.env.E2E_MOCK === "true") {
    await registerE2EMock(app);
  }

  applySecurityHeaders(app);

  app.get("/", async (_req, reply) => {
    if (!existsSync(DIST_DIR)) {
      return reply
        .type("text/plain")
        .send("Frontend not built yet. Run `npm run dev` for the Vite dev server.");
    }
    return reply.sendFile("index.html");
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url && !req.raw.url.startsWith("/api/") && existsSync(DIST_DIR)) {
      return reply.sendFile("index.html");
    }
    return reply.code(404).send({ error: "not_found" });
  });

  return app;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: "0.0.0.0" });
}