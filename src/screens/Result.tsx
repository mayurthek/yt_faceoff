import type { Channel, FaceOffGame } from "../game/types";

interface ResultProps {
  game: FaceOffGame;
  onPlayAgain: () => void;
  onStartOver: () => void;
}

export default function Result({ game, onPlayAgain, onStartOver }: ResultProps) {
  const winner: Channel | undefined = game.winner;
  if (!winner) return null;

  return (
    <main className="screen">
      <p className="wordmark">Face-Off</p>
      <h1>Your Favorite Channel</h1>
      {winner.thumbnailUrl ? (
        <img
          className="thumbnail result__thumbnail"
          src={winner.thumbnailUrl}
          alt={`${winner.title} thumbnail`}
        />
      ) : (
        <div className="thumbnail thumbnail--placeholder result__thumbnail" aria-hidden="true" />
      )}
      <h2 className="result__name">{winner.title}</h2>
      <div className="result__actions">
        <button type="button" className="button button--primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <a
          className="button button--ghost"
          href={winner.channelUrl}
          target="_blank"
          rel="noreferrer"
        >
          View on YouTube
        </a>
      </div>
      <button type="button" className="link-button" onClick={onStartOver}>
        Start Over with Updated Subscriptions
      </button>
    </main>
  );
}