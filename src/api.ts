import type { Channel } from "./game/types";
import { sanitizeChannels } from "./game/game";

export type ApiErrorKind =
  | "oauth_cancelled"
  | "oauth_failed"
  | "api_failure"
  | "no_subscriptions"
  | "session_expired"
  | "network";

export class ApiError extends Error {
  kind: ApiErrorKind;
  retryable: boolean;

  constructor(kind: ApiErrorKind, message: string, retryable = true) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

type SubscriptionsResponse =
  | { ok: true; channels: Channel[] }
  | { ok: false; error: ApiErrorKind };

export async function getSessionStatus(): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch("/api/auth/status", { credentials: "same-origin" });
  } catch {
    throw new ApiError("network", "We lost the connection.");
  }
  const body = (await response.json().catch(() => ({}))) as { authenticated?: boolean };
  return body.authenticated === true;
}

export async function fetchSubscriptions(): Promise<Channel[]> {
  let response: Response;
  try {
    response = await fetch("/api/subscriptions", {
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("network", "We lost the connection.");
  }

  let body: SubscriptionsResponse;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("api_failure", "We could not load your subscriptions right now.");
  }

  if (!body.ok) {
    throw new ApiError(body.error, "We could not load your subscriptions right now.");
  }
  if (!response.ok) {
    throw new ApiError("api_failure", "We could not load your subscriptions right now.");
  }
  return sanitizeChannels(body.channels);
}

export async function startOAuthFlow(): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/url", { credentials: "same-origin" });
  } catch {
    throw new ApiError("network", "We lost the connection.");
  }
  if (!response.ok) {
    throw new ApiError("oauth_failed", "We could not connect to YouTube.");
  }
  const body = (await response.json()) as { authUrl: string };
  window.location.assign(body.authUrl);
}