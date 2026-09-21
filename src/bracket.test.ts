import { describe, expect, it } from "vitest";
import {
  buildBracket,
  formatSubscriberCount,
  roundLabel,
  totalRounds,
} from "./bracket";
import { advance, createGame } from "./game/game";
import type { Channel } from "./game/types";

const alwaysZero = () => 0;

function channel(id: string, title = `Channel ${id}`): Channel {
  return { id, title, channelUrl: `https://youtube.com/channel/${id}` };
}

function channels(n: number): Channel[] {
  return Array.from({ length: n }, (_, i) => channel(`c${i + 1}`, `Ch ${i + 1}`));
}

function playAll(game: ReturnType<typeof createGame>) {
  let current = game;
  while (current.status === "playing") {
    current = advance(current, "left");
  }
  return current;
}

describe("totalRounds", () => {
  it("counts the rounds needed for a given number of channels", () => {
    expect(totalRounds(1)).toBe(0);
    expect(totalRounds(2)).toBe(1);
    expect(totalRounds(3)).toBe(2);
    expect(totalRounds(4)).toBe(2);
    expect(totalRounds(5)).toBe(3);
    expect(totalRounds(8)).toBe(3);
  });
});

describe("roundLabel", () => {
  it("names rounds from Round N up to the Final", () => {
    expect(roundLabel(1, 1)).toBe("Final");
    expect(roundLabel(1, 2)).toBe("Round 1");
    expect(roundLabel(2, 2)).toBe("Final");
    expect(roundLabel(1, 3)).toBe("Quarterfinals");
    expect(roundLabel(2, 3)).toBe("Semifinals");
    expect(roundLabel(3, 3)).toBe("Final");
    expect(roundLabel(1, 4)).toBe("Round 1");
    expect(roundLabel(2, 4)).toBe("Quarterfinals");
    expect(roundLabel(3, 4)).toBe("Semifinals");
    expect(roundLabel(4, 4)).toBe("Final");
  });
});

describe("formatSubscriberCount", () => {
  it("formats large counts as abbreviated strings", () => {
    expect(formatSubscriberCount(999)).toBe("999");
    expect(formatSubscriberCount(1000)).toBe("1K");
    expect(formatSubscriberCount(2500)).toBe("2.5K");
    expect(formatSubscriberCount(1500000)).toBe("1.5M");
    expect(formatSubscriberCount(1000000000)).toBe("1B");
  });

  it("returns undefined for missing or negative counts", () => {
    expect(formatSubscriberCount(undefined)).toBeUndefined();
    expect(formatSubscriberCount(-5)).toBeUndefined();
  });
});

describe("buildBracket", () => {
  it("builds a single Final round for a finished two-channel game", () => {
    const game = playAll(createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero));
    const model = buildBracket(game);

    expect(model.rounds).toHaveLength(1);
    const [round] = model.rounds;
    expect(round.label).toBe("Final");
    expect(round.isFinal).toBe(true);
    expect(round.matches).toHaveLength(1);
    expect(round.matches[0]!.state).toBe("played");
    expect(model.champion?.id).toBe(game.winner!.id);
  });

  it("records byes for incomplete rounds", () => {
    const game = playAll(createGame(channels(3), alwaysZero));
    const model = buildBracket(game);

    expect(model.rounds).toHaveLength(2);
    const [round1, round2] = model.rounds;
    expect(round1.matches[0]!.state).toBe("played");
    expect(round1.matches[1]!.state).toBe("bye");
    expect(round1.matches[1]!.winner?.id).toBe("c1");
    expect(round2.matches[0]!.state).toBe("played");
    expect(model.champion?.id).toBe(game.winner!.id);
  });

  it("marks the current matchup as active and later rounds as tbd", () => {
    const game = createGame(channels(4), alwaysZero);
    const model = buildBracket(game);

    expect(model.rounds).toHaveLength(2);
    const [round1, round2] = model.rounds;
    expect(round1.matches[0]!.state).toBe("active");
    expect(round1.matches[1]!.state).toBe("pending");
    expect(round2.matches[0]!.state).toBe("tbd");
    expect(model.champion).toBeUndefined();
  });

  it("plays an active slot after the first match of the round", () => {
    const game = advance(createGame(channels(4), alwaysZero), "left");
    const model = buildBracket(game);

    const [round1] = model.rounds;
    expect(round1.matches[0]!.state).toBe("played");
    expect(round1.matches[1]!.state).toBe("active");
    expect(game.winner).toBeUndefined();
  });

  it("labels a 5-channel bracket with Quarterfinals through Final", () => {
    const game = createGame(channels(5), alwaysZero);
    const model = buildBracket(game);

    expect(model.rounds.map((r) => r.label)).toEqual([
      "Quarterfinals",
      "Semifinals",
      "Final",
    ]);
    expect(model.rounds[2]!.matches[0]!.state).toBe("tbd");
  });

  it("returns an empty model for a not-started game", () => {
    const game = createGame([], alwaysZero);
    const model = buildBracket(game);
    expect(model.rounds).toHaveLength(0);
    expect(model.champion).toBeUndefined();
  });

  it("never mutates the game while building a bracket", () => {
    const game = createGame(channels(4), alwaysZero);
    const snapshot = JSON.stringify(game);
    buildBracket(game);
    expect(JSON.stringify(game)).toBe(snapshot);
  });
});