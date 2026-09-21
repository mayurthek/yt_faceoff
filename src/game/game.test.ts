import { describe, expect, it } from "vitest";
import type { Channel } from "./types";
import {
  advance,
  createAdvanceGuard,
  createGame,
  dedupeById,
  playAgain,
  sanitizeChannels,
  shuffle,
  type Rng,
} from "./game";

function seedRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const alwaysZero: Rng = () => 0;

function channel(id: string, title = `Channel ${id}`): Channel {
  return {
    id,
    title,
    channelUrl: `https://www.youtube.com/channel/${id}`,
  };
}

function channels(n: number): Channel[] {
  return Array.from({ length: n }, (_, i) => channel(`c${i + 1}`));
}

function playWholeGame(
  game: ReturnType<typeof createGame>,
  pick: (game: ReturnType<typeof createGame>) => "left" | "right",
) {
  let current = game;
  const picks: ReturnType<typeof createGame>[] = [];
  while (current.status === "playing") {
    picks.push(current);
    current = advance(current, pick(current));
  }
  return { current, picks };
}

describe("normalization helpers", () => {
  it("dedupeById keeps the first occurrence of each channel id", () => {
    const list = [channel("a"), channel("b"), channel("a")];
    const result = dedupeById(list);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("sanitizeChannels drops malformed records and derives a channel url", () => {
    const raw = [
      { id: "a", title: "Alpha", thumbnailUrl: "https://x/thumb.jpg" },
      { id: "b", title: "Beta" },
      null,
      { id: "", title: "bad id" },
      { id: "d", title: 42 },
      { id: "e", title: "Epsilon", channelUrl: "https://y/c" },
      "string",
    ];
    const result = sanitizeChannels(raw);
    expect(result).toEqual([
      { id: "a", title: "Alpha", thumbnailUrl: "https://x/thumb.jpg", channelUrl: "https://www.youtube.com/channel/a" },
      { id: "b", title: "Beta", channelUrl: "https://www.youtube.com/channel/b" },
      { id: "e", title: "Epsilon", channelUrl: "https://y/c" },
    ]);
  });

  it("shuffle returns all items, in a different order for some seed", () => {
    const input = channels(8);
    const orders = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      orders.add(shuffle(input, seedRng(seed)).map((c) => c.id).join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("createGame", () => {
  it("is not_started and has no winner with fewer than two channels", () => {
    const empty = createGame([], alwaysZero);
    expect(empty.status).toBe("not_started");
    expect(empty.winner).toBeUndefined();
    expect(empty.totalMatches).toBe(0);

    const single = createGame([channel("a")], alwaysZero);
    expect(single.status).toBe("not_started");
    expect(single.totalMatches).toBe(0);
  });

  it("totalMatches is channels - 1 for 2..8 channels", () => {
    for (let n = 2; n <= 8; n++) {
      const game = createGame(channels(n), seedRng(n));
      expect(game.totalMatches).toBe(n - 1);
      expect(game.status).toBe("playing");
      expect(game.completedMatches).toBe(0);
      expect(game.round).toBe(1);
    }
  });

  it("two channels produce one matchup and one winner", () => {
    const game = createGame(channels(2), seedRng(1));
    expect(game.currentMatchup[0]?.id).toBeDefined();
    expect(game.currentMatchup[1]?.id).toBeDefined();
    expect(game.currentMatchup[0]!.id).not.toBe(game.currentMatchup[1]!.id);

    const result = advance(game, "left");
    expect(result.status).toBe("finished");
    expect(result.winner?.id).toBe(game.currentMatchup[0]!.id);
    expect(result.completedMatches).toBe(1);
    expect(result.totalMatches).toBe(1);
  });
});

describe("byes and bracket shape", () => {
  it("three channels produce one bye and a final matchup", () => {
    const game = createGame(channels(3), alwaysZero);
    // alwaysZero reverses the order, so the third channel lingers as a bye.
    const afterFirst = advance(game, "left");
    expect(afterFirst.status).toBe("playing");
    expect(afterFirst.currentRound).toHaveLength(2);
    expect(afterFirst.currentRound.map((c) => c.id)).toContain("c1");

    const result = advance(afterFirst, "right");
    expect(result.status).toBe("finished");
    expect(result.completedMatches).toBe(2);
    expect(result.totalMatches).toBe(2);
  });

  it("four channels produce two first-round matchups and one final matchup", () => {
    const game = createGame(channels(4), alwaysZero);
    const afterFirst = advance(game, "left");
    expect(afterFirst.completedMatches).toBe(1);
    expect(afterFirst.currentMatchup[0]!.id).not.toBe(afterFirst.currentMatchup[1]!.id);

    const afterSecond = advance(afterFirst, "left");
    expect(afterSecond.completedMatches).toBe(2);
    expect(afterSecond.round).toBe(2);

    const result = advance(afterSecond, "left");
    expect(result.status).toBe("finished");
    expect(result.completedMatches).toBe(3);
    expect(result.winner).toBeDefined();
  });

  it("five channels complete successfully", () => {
    const game = createGame(channels(5), alwaysZero);
    const { current } = playWholeGame(game, () => "left");
    expect(current.status).toBe("finished");
    expect(current.winner).toBeDefined();
    expect(current.completedMatches).toBe(4);
  });
});

describe("advance behavior", () => {
  it("never pairs a channel against itself and never repeats a channel twice", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const game = createGame(channels(8), seedRng(seed));
      const seen = new Set<string>();
      for (const c of game.currentRound) {
        expect(seen.has(c.id)).toBe(false);
        seen.add(c.id);
      }
      const { current } = playWholeGame(game, () => "left");
      expect(current.winner).toBeDefined();
    }
  });

  it("choosing left advances the left channel; choosing right advances the right channel", () => {
    const game = createGame(channels(4), alwaysZero);
    const [left, right] = game.currentMatchup;

    const afterLeft = advance(game, "left");
    expect(afterLeft.nextRound[0]?.id).toBe(left!.id);

    const afterRight = advance(game, "right");
    expect(afterRight.nextRound[0]?.id).toBe(right!.id);

    expect(afterLeft.completedMatches).toBe(1);
    expect(afterRight.completedMatches).toBe(1);
  });

  it("is a pure function and never mutates the input game", () => {
    const game = createGame(channels(4), alwaysZero);
    const snapshot = JSON.parse(JSON.stringify(game));
    advance(game, "left");
    expect(JSON.stringify(game)).toBe(JSON.stringify(snapshot));
  });

  it("no-ops when the game is already finished", () => {
    const game = createGame(channels(2), alwaysZero);
    const finished = advance(game, "left");
    const again = advance(finished, "left");
    expect(again).toBe(finished);
  });
});

describe("double-click guard", () => {
  it("prevents the same state from advancing twice", () => {
    const guard = createAdvanceGuard();
    const game = createGame(channels(4), alwaysZero);
    const first = guard(game, "left")!;
    expect(first.completedMatches).toBe(1);
    expect(first.status).toBe("playing");

    const second = guard(game, "left")!;
    expect(second).toBe(game);
    expect(second.completedMatches).toBe(0);
    expect(second.status).toBe("playing");
  });

  it("still advances once the state has moved on", () => {
    const guard = createAdvanceGuard();
    const game = createGame(channels(3), alwaysZero);
    const first = guard(game, "left")!;
    const second = guard(first, "left")!;
    expect(second).not.toBe(first);
    expect(second.completedMatches).toBe(first.completedMatches + 1);
  });
});

describe("reset and refresh", () => {
  it("playAgain resets and randomizes the tournament with the same channels", () => {
    const game = createGame(channels(6), seedRng(1));
    const finished = playWholeGame(game, () => "right").current;
    expect(finished.status).toBe("finished");

    const replayed = playAgain(finished, seedRng(2));
    expect(replayed.status).toBe("playing");
    expect(replayed.completedMatches).toBe(0);
    expect(replayed.totalMatches).toBe(5);
    expect(replayed.currentRound.map((c) => c.id).sort()).toEqual(
      game.allChannels.map((c) => c.id).sort(),
    );
    expect(replayed.currentRound.map((c) => c.id)).not.toEqual(
      game.currentRound.map((c) => c.id),
    );
  });

  it("updated subscriptions replace the old channel list", () => {
    const game = createGame(channels(4), alwaysZero);
    const replacement = channels(3).map((c) => ({ ...c, title: `New ${c.title}` }));
    const fresh = createGame(replacement, seedRng(7));
    expect(fresh.allChannels.map((c) => c.id).sort()).toEqual(["c1", "c2", "c3"]);
    expect(fresh.allChannels.find((c) => c.id === "c1")?.title).toBe(
      "New Channel c1",
    );
    expect(fresh.totalMatches).toBe(2);
    expect(fresh).not.toBe(game);
  });
});