import crypto from "node:crypto";
import type { GoogleTokens } from "./oauth.js";

export interface Session {
  id: string;
  state?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  createdAt: number;
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24;

export class SessionStore {
  private sessions = new Map<string, Session>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  create(state?: string): Session {
    const id = crypto.randomBytes(24).toString("hex");
    const session: Session = { id, state, createdAt: Date.now() };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string | undefined): Session | undefined {
    if (!id) return undefined;
    const session = this.sessions.get(id);
    if (!session) return undefined;
    if (Date.now() - session.createdAt > this.ttlMs) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  update(id: string, patch: Partial<Session>): void {
    const session = this.sessions.get(id);
    if (session) Object.assign(session, patch);
  }

  delete(id: string | undefined): void {
    if (id) this.sessions.delete(id);
  }

  clear(): void {
    this.sessions.clear();
  }
}

export function toSessionTokens(tokens: GoogleTokens): {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
} {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
}