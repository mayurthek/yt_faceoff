import type { Channel } from "./game/types";
import {
  fetchSubscriptions,
  startOAuthFlow,
  getSessionStatus,
  type ApiErrorKind,
} from "./api";

function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK !== "false";
}

export function usesMockData(): boolean {
  return isMockMode();
}

export async function loadSubscriptions(): Promise<Channel[]> {
  return isMockMode()
    ? (await import("./mock")).fetchMockSubscriptions()
    : fetchSubscriptions();
}

export async function connectYouTube(): Promise<boolean> {
  if (isMockMode()) return true;
  await startOAuthFlow();
  return false;
}

export async function restoreSession(): Promise<boolean> {
  if (isMockMode()) return false;
  return getSessionStatus();
}

export type { ApiErrorKind };
export { ApiError } from "./api";