import { existsSync } from "node:fs";

export type ServerConfig = {
  port: number;
  baseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  cookieSecret: string;
  oauthScope: string;
  tokenEndpoint?: string;
  subscriptionsEndpoint?: string;
};

export function loadConfig(): ServerConfig {
  const envFile = ".env.local";
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  } else {
    console.warn("No .env.local found; OAuth will not work until you create one.");
  }

  return {
    port: Number(process.env.PORT ?? 3001),
    baseUrl: process.env.BASE_URL ?? "http://localhost:3001",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    cookieSecret: process.env.COOKIE_SECRET ?? "dev-insecure-secret",
    oauthScope: process.env.OAUTH_SCOPE ?? "https://www.googleapis.com/auth/youtube.readonly",
    tokenEndpoint: process.env.E2E_TOKEN_ENDPOINT,
    subscriptionsEndpoint: process.env.E2E_SUBSCRIPTIONS_ENDPOINT,
  };
}