import crypto from "node:crypto";
import type { ServerConfig } from "./config.js";

export type OAuthFailureKind = "oauth_failed" | "session_expired";

export class OAuthError extends Error {
  kind: OAuthFailureKind;

  constructor(kind: OAuthFailureKind, message: string) {
    super(message);
    this.name = "OAuthError";
    this.kind = kind;
  }
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface OAuthRuntime {
  authEndpoint: string;
  tokenEndpoint: string;
  fetchImpl: typeof fetch;
  newState: () => string;
}

const DEFAULT_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export function createOAuth(
  config: ServerConfig,
  runtime: Partial<OAuthRuntime> = {},
) {
  const authEndpoint = runtime.authEndpoint ?? DEFAULT_AUTH_ENDPOINT;
  const tokenEndpoint = runtime.tokenEndpoint ?? DEFAULT_TOKEN_ENDPOINT;
  const fetchImpl = runtime.fetchImpl ?? fetch;
  const newState = runtime.newState ?? (() => crypto.randomBytes(16).toString("hex"));
  const redirectUri = `${config.baseUrl}/api/auth/callback`;

  async function postTokenRequest(
    form: URLSearchParams,
    failKind: OAuthFailureKind,
  ): Promise<GoogleTokens> {
    let response: Response;
    try {
      response = await fetchImpl(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    } catch {
      throw new OAuthError(failKind, "Token endpoint was unreachable");
    }
    const data = (await response.json().catch(() => ({}))) as Partial<GoogleTokens>;
    if (!response.ok || data.error) {
      throw new OAuthError(
        failKind,
        data.error_description ?? `Token request failed (${response.status})`,
      );
    }
    return data as GoogleTokens;
  }

  const credentials = {
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
  };

  return {
    newState,

    buildAuthUrl(state: string): string {
      const params = new URLSearchParams({
        ...credentials,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config.oauthScope,
        access_type: "offline",
        prompt: "consent",
        state,
      });
      return `${authEndpoint}?${params.toString()}`;
    },

    exchangeCode(code: string): Promise<GoogleTokens> {
      const form = new URLSearchParams({
        ...credentials,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });
      return postTokenRequest(form, "oauth_failed");
    },

    refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
      const form = new URLSearchParams({
        ...credentials,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });
      return postTokenRequest(form, "session_expired");
    },
  };
}

export type OAuth = ReturnType<typeof createOAuth>;