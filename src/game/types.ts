export interface Channel {
  id: string;
  title: string;
  thumbnailUrl?: string;
  channelUrl: string;
}

export type Side = "left" | "right";

export type GameStatus = "not_started" | "playing" | "finished";

export interface FaceOffGame {
  allChannels: Channel[];
  currentRound: Channel[];
  nextRound: Channel[];
  currentMatchup: [Channel, Channel?];
  completedMatches: number;
  totalMatches: number;
  round: number;
  winner?: Channel;
  status: GameStatus;
}