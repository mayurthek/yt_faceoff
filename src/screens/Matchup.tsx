import { useEffect } from "react";
import type { Channel, FaceOffGame, Side } from "../game/types";

interface MatchupProps {
  game: FaceOffGame;
  onChoose: (side: Side) => void;
}

function Thumbnail({ channel }: { channel: Channel }) {
  if (!channel.thumbnailUrl) {
    return <div className="thumbnail thumbnail--placeholder" aria-hidden="true" />;
  }
  return (
    <img
      className="thumbnail"
      src={channel.thumbnailUrl}
      alt={`${channel.title} thumbnail`}
      loading="lazy"
    />
  );
}

function ChannelCard({
  side,
  channel,
  onChoose,
}: {
  side: Side;
  channel: Channel;
  onChoose: (side: Side) => void;
}) {
  return (
    <section className="card channel-card">
      <h2 className="channel-card__title">{channel.title}</h2>
      <Thumbnail channel={channel} />
      <button
        type="button"
        className="button button--choice"
        aria-label={`Choose ${channel.title}`}
        onClick={() => onChoose(side)}
      >
        {side === "left" ? "Choose left" : "Choose right"}
      </button>
    </section>
  );
}

export default function Matchup({ game, onChoose }: MatchupProps) {
  const [left, right] = game.currentMatchup;

  useEffect(() => {
    if (!left || !right) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChoose("left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChoose("right");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [left, right, onChoose]);

  if (!left || !right) return null;

  return (
    <main className="screen">
      <p className="wordmark">Face-Off</p>
      <div className="matchup__meta" aria-live="polite">
        <span>Round {game.round}</span>
        <span>
          Match {game.completedMatches + 1} of {game.totalMatches}
        </span>
      </div>
      <div className="matchup">
        <ChannelCard side="left" channel={left} onChoose={onChoose} />
        <div className="matchup__vs" aria-hidden="true">
          VS
        </div>
        <ChannelCard side="right" channel={right} onChoose={onChoose} />
      </div>
      <p className="matchup__hint">Use the Left and Right arrow keys to choose.</p>
    </main>
  );
}