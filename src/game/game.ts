import type { Channel, FaceOffGame, Side } from "./types";

export type Rng = () => number;

export function dedupeById(channels: readonly Channel[]): Channel[] {
  const seen = new Set<string>();
  const out: Channel[] = [];
  for (const channel of channels) {
    if (!seen.has(channel.id)) {
      seen.add(channel.id);
      out.push(channel);
    }
  }
  return out;
}

export function sanitizeChannels(raw: readonly unknown[]): Channel[] {
  const out: Channel[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const { id, title } = record;
    if (typeof id !== "string" || id === "") continue;
    if (typeof title !== "string" || title === "") continue;
    const thumbnailUrl =
      typeof record.thumbnailUrl === "string" && record.thumbnailUrl !== ""
        ? record.thumbnailUrl
        : undefined;
    const subscriberCount =
      typeof record.subscriberCount === "number" &&
      Number.isFinite(record.subscriberCount) &&
      record.subscriberCount > 0
        ? record.subscriberCount
        : undefined;
    const channelUrl =
      typeof record.channelUrl === "string" && record.channelUrl !== ""
        ? record.channelUrl
        : `https://www.youtube.com/channel/${id}`;
    out.push({ id, title, thumbnailUrl, subscriberCount, channelUrl });
  }
  return out;
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pairHead(round: readonly Channel[]): [Channel, Channel?] {
  return [round[0], round[1]] as [Channel, Channel?];
}

export function createGame(
  channels: readonly Channel[],
  rng: Rng = Math.random,
): FaceOffGame {
  const order = shuffle(dedupeById(channels), rng);
  const count = order.length;
  const totalMatches = count > 1 ? count - 1 : 0;
  const currentMatchup =
    count === 0 ? ([] as unknown as [Channel, Channel?]) : pairHead(order);
  const canStart = count >= 2;

  return {
    allChannels: order,
    currentRound: order,
    nextRound: [],
    currentMatchup,
    completedMatches: 0,
    totalMatches,
    round: 1,
    winner: undefined,
    status: canStart ? "playing" : "not_started",
    history: [],
  };
}

export function advance(game: FaceOffGame, side: Side): FaceOffGame {
  if (game.status !== "playing") return game;
  const [left, right] = game.currentMatchup;
  if (!left || !right) return game;

  const winner = side === "left" ? left : right;
  const completedMatches = game.completedMatches + 1;
  const nextRound = [...game.nextRound, winner];
  const history = [
    ...game.history,
    { round: game.round, left, right, winner },
  ];
  const rest = game.currentRound.filter(
    (channel) => channel.id !== left.id && channel.id !== right.id,
  );

  if (rest.length === 1 && game.currentRound.length % 2 === 1) {
    nextRound.push(rest[0]);
    rest.length = 0;
  }

  if (rest.length === 0) {
    if (nextRound.length === 1) {
      const winnerChannel = nextRound[0]!;
      return {
        ...game,
        currentRound: nextRound,
        nextRound: [],
        currentMatchup: [winnerChannel, undefined],
        completedMatches,
        history,
        winner: winnerChannel,
        status: "finished",
      };
    }
    return {
      ...game,
      currentRound: nextRound,
      nextRound: [],
      currentMatchup: pairHead(nextRound),
      completedMatches,
      history,
      round: game.round + 1,
    };
  }

  return {
    ...game,
    currentRound: rest,
    nextRound,
    currentMatchup: pairHead(rest),
    completedMatches,
    history,
  };
}

export function playAgain(game: FaceOffGame, rng: Rng = Math.random): FaceOffGame {
  return createGame(game.allChannels, rng);
}

export function createAdvanceGuard() {
  let lastGame: FaceOffGame | undefined;
  return function select(
    game: FaceOffGame | undefined,
    side: Side,
  ): FaceOffGame | undefined {
    if (!game) return undefined;
    if (game === lastGame) return game;
    lastGame = game;
    return advance(game, side);
  };
}