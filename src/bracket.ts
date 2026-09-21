import type { Channel, FaceOffGame, PlayedMatch } from "./game/types";

export type BracketMatchState = "played" | "bye" | "active" | "pending" | "tbd";

export interface BracketMatch {
  left?: Channel;
  right?: Channel;
  winner?: Channel;
  state: BracketMatchState;
}

export interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
  isFinal: boolean;
}

export interface BracketModel {
  rounds: BracketRound[];
  champion?: Channel;
}

export function totalRounds(n: number): number {
  let rounds = 0;
  let count = n;
  while (count > 1) {
    rounds += 1;
    count = Math.ceil(count / 2);
  }
  return rounds;
}

function roundSizeAt(firstRoundSize: number, round: number): number {
  return totalRounds(firstRoundSize) >= round
    ? Math.ceil(firstRoundSize / 2 ** (round - 1))
    : 0;
}

export function roundLabel(round: number, lastRound: number): string {
  if (round === lastRound) return "Final";
  if (round === lastRound - 1) return lastRound === 2 ? `Round ${round}` : "Semifinals";
  if (round === lastRound - 2) return "Quarterfinals";
  return `Round ${round}`;
}

function participantsForRound(
  allChannels: Channel[],
  history: PlayedMatch[],
  round: number,
): Channel[] {
  if (round === 1) return allChannels;
  const previousMatches = history.filter((m) => m.round === round - 1);
  const previousParticipants = participantsForRound(allChannels, history, round - 1);
  const playedIds = new Set(
    previousMatches.flatMap((m) => [m.left.id, m.right.id]),
  );
  const winners = previousMatches.map((m) => m.winner);
  const byes = previousParticipants.filter((c) => !playedIds.has(c.id));
  return [...winners, ...byes];
}

function matchesForCompletedRound(
  participants: Channel[],
  playedMatches: PlayedMatch[],
): BracketMatch[] {
  const matches: BracketMatch[] = [];
  for (let s = 0; s < Math.ceil(participants.length / 2); s++) {
    const played = playedMatches[s];
    if (played) {
      matches.push({
        left: played.left,
        right: played.right,
        winner: played.winner,
        state: "played",
      });
      continue;
    }
    const left = participants[2 * s];
    const right = participants[2 * s + 1];
    if (!left || !right) {
      matches.push({
        left: left ?? right,
        winner: left ?? right,
        state: "bye",
      });
    } else {
      matches.push({ left, right, state: "tbd" });
    }
  }
  return matches;
}

function matchesForCurrentRound(
  participants: Channel[],
  playedMatches: PlayedMatch[],
  activeMatchup: [Channel, Channel?] | undefined,
): BracketMatch[] {
  const matches: BracketMatch[] = [];
  const slotCount = Math.ceil(participants.length / 2);
  const playedCount = playedMatches.length;

  for (let s = 0; s < slotCount; s++) {
    const played = playedMatches[s];
    if (played) {
      matches.push({
        left: played.left,
        right: played.right,
        winner: played.winner,
        state: "played",
      });
      continue;
    }

    if (s === playedCount && activeMatchup) {
      const [left, right] = activeMatchup;
      if (left && right) {
        matches.push({ left, right, state: "active" });
        continue;
      }
    }

    const left = participants[2 * s];
    const right = participants[2 * s + 1];
    if (!left || !right) {
      matches.push({
        left: left ?? right,
        winner: left ?? right,
        state: "bye",
      });
    } else {
      matches.push({ left, right, state: "pending" });
    }
  }
  return matches;
}

function matchesForFutureRound(size: number): BracketMatch[] {
  const matches: BracketMatch[] = [];
  for (let s = 0; s < Math.ceil(size / 2); s++) {
    matches.push({ state: "tbd" });
  }
  return matches;
}

export function buildBracket(game: FaceOffGame): BracketModel {
  if (game.status === "not_started" || game.allChannels.length === 0) {
    return { rounds: [], champion: game.winner };
  }

  const lastRound = totalRounds(game.allChannels.length);
  const rounds: BracketRound[] = [];

  for (let r = 1; r <= lastRound; r++) {
    const playedMatches = game.history.filter((m) => m.round === r);
    let matches: BracketMatch[];

    if (r < game.round) {
      const participants = participantsForRound(game.allChannels, game.history, r);
      matches = matchesForCompletedRound(participants, playedMatches);
    } else if (r === game.round) {
      const participants = participantsForRound(game.allChannels, game.history, r);
      const activeMatchup =
        game.status === "playing" ? game.currentMatchup : undefined;
      matches = matchesForCurrentRound(participants, playedMatches, activeMatchup);
    } else {
      const size = roundSizeAt(game.allChannels.length, r);
      matches = matchesForFutureRound(size);
    }

    rounds.push({
      round: r,
      label: roundLabel(r, lastRound),
      matches,
      isFinal: r === lastRound,
    });
  }

  return { rounds, champion: game.winner };
}

export function formatSubscriberCount(count?: number): string | undefined {
  if (count === undefined || count < 0) return undefined;
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(count);
}