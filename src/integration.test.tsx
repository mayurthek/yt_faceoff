// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import type { Channel } from "./game/types";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const channels: Channel[] = [
  { id: "a", title: "Alpha", channelUrl: "https://youtube.com/channel/a" },
  { id: "b", title: "Beta", channelUrl: "https://youtube.com/channel/b" },
];

let fetchMock: ReturnType<typeof vi.fn>;

function stubFetch(routes: Record<string, () => Response>) {
  fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    for (const [suffix, handler] of Object.entries(routes)) {
      if (url.endsWith(suffix)) return Promise.resolve(handler());
    }
    return Promise.reject(new Error(`unhandled fetch: ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
}

beforeAll(() => {
  vi.stubEnv("VITE_USE_MOCK", "false");
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App in real (non-mock) mode", () => {
  it("restores an existing session and lands on ready", async () => {
    stubFetch({
      "/api/auth/status": () => jsonResponse(200, { ok: true, authenticated: true }),
      "/api/subscriptions": () => jsonResponse(200, { ok: true, channels }),
    });
    render(<App />);
    expect(await screen.findByText("You have 2 subscribed channels.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/status"),
      { credentials: "same-origin" },
    );
  });

  it("stays on landing when there is no session", async () => {
    stubFetch({
      "/api/auth/status": () => jsonResponse(200, { ok: true, authenticated: false }),
    });
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Find Your Favorite YouTube Channel" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("You have 2 subscribed channels.")).not.toBeInTheDocument();
  });

  it("shows the reconnect error when the session has expired", async () => {
    stubFetch({
      "/api/auth/status": () => jsonResponse(200, { ok: true, authenticated: true }),
      "/api/subscriptions": () =>
        jsonResponse(401, { ok: false, error: "session_expired", message: "Not connected." }),
    });
    render(<App />);
    expect(
      await screen.findByText("Your YouTube connection expired."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reconnect YouTube" }),
    ).toBeInTheDocument();
  });

  it("plays a full face-off after a restored session", async () => {
    stubFetch({
      "/api/auth/status": () => jsonResponse(200, { ok: true, authenticated: true }),
      "/api/subscriptions": () => jsonResponse(200, { ok: true, channels }),
    });
    render(<App />);

    expect(await screen.findByText("You have 2 subscribed channels.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Face-Off" }));
    expect(await screen.findByText("Match 1 of 1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /^Choose / })[0]!);
    expect(await screen.findByText("Your Favorite Channel")).toBeInTheDocument();
  });

  it("performs a full OAuth round trip on Connect", async () => {
    stubFetch({
      "/api/auth/status": () => jsonResponse(200, { ok: true, authenticated: false }),
      "/api/auth/url": () => jsonResponse(200, { ok: true, authUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=x" }),
      "/api/subscriptions": () => jsonResponse(200, { ok: true, channels }),
    });

    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign, search: "", pathname: "/" },
    });

    render(<App />);
    await screen.findByRole("button", { name: "Connect YouTube" });
    fireEvent.click(screen.getByRole("button", { name: "Connect YouTube" }));

    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(
        "https://accounts.google.com/o/oauth2/v2/auth?state=x",
      );
    });
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).endsWith("/api/auth/url")),
    ).toBe(true);
  });
});