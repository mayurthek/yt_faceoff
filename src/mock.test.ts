import { describe, expect, it } from "vitest";
import { fetchMockSubscriptions } from "./mock";

describe("fetchMockSubscriptions", () => {
  it("resolves to at least two playable channels with a valid shape", async () => {
    const subs = await fetchMockSubscriptions(0);
    expect(subs.length).toBeGreaterThanOrEqual(2);
    for (const channel of subs) {
      expect(channel.id.length).toBeGreaterThan(0);
      expect(channel.title.length).toBeGreaterThan(0);
      expect(channel.channelUrl).toContain("youtube.com");
    }
  });

  it("returns defensive copies each call", async () => {
    const first = await fetchMockSubscriptions(0);
    first[0]!.title = "Hacked";
    const second = await fetchMockSubscriptions(0);
    expect(second[0]!.title).not.toBe("Hacked");
  });
});