import { formatSubscriberCount } from "../bracket";
import type { BracketMatch, BracketModel, BracketRound } from "../bracket";
import type { Channel } from "../game/types";

function Avatar({ channel }: { channel: Channel }) {
  const label = `avatar for ${channel.title}`;
  if (!channel.thumbnailUrl) {
    return <span className="bracket__avatar bracket__avatar--empty" aria-label={label} />;
  }
  return (
    <img
      className="bracket__avatar"
      src={channel.thumbnailUrl}
      alt={label}
      loading="lazy"
    />
  );
}

function ChannelIdentity({
  channel,
  state,
}: {
  channel: Channel;
  state: "won" | "lost" | "neutral";
}) {
  const subs = formatSubscriberCount(channel.subscriberCount);
  return (
    <div className={`bracket__identity bracket__identity--${state}`}>
      <Avatar channel={channel} />
      <div className="bracket__identity-text">
        <span className="bracket__name">{channel.title}</span>
        {subs && <span className="bracket__subs">{subs} subscribers</span>}
      </div>
    </div>
  );
}

function MatchupView({ match }: { match: BracketMatch }) {
  switch (match.state) {
    case "played": {
      const winnerLost = (channel: Channel) => match.winner?.id !== channel.id;
      return (
        <div className="bracket__match bracket__match--played">
          <div className="bracket__slot">
            <ChannelIdentity channel={match.left!} state={winnerLost(match.left!) ? "lost" : "won"} />
          </div>
          <div className="bracket__slot">
            <ChannelIdentity channel={match.right!} state={winnerLost(match.right!) ? "lost" : "won"} />
          </div>
        </div>
      );
    }
    case "active":
      return (
        <div className="bracket__match bracket__match--active" aria-label="Current matchup">
          <div className="bracket__slot">
            <ChannelIdentity channel={match.left!} state="neutral" />
          </div>
          <div className="bracket__slot">
            <ChannelIdentity channel={match.right!} state="neutral" />
          </div>
          <span className="bracket__vs" aria-hidden="true">
            VS
          </span>
        </div>
      );
    case "bye":
      return (
        <div className="bracket__match bracket__match--bye">
          <div className="bracket__slot">
            <ChannelIdentity channel={match.left!} state="won" />
            <span className="bracket__bye-label">Bye</span>
          </div>
        </div>
      );
    case "pending":
      return (
        <div className="bracket__match bracket__match--pending">
          <div className="bracket__slot">
            <ChannelIdentity channel={match.left!} state="neutral" />
          </div>
          <div className="bracket__slot">
            <ChannelIdentity channel={match.right!} state="neutral" />
          </div>
        </div>
      );
    case "tbd":
      return (
        <div className="bracket__match bracket__match--tbd">
          <div className="bracket__slot bracket__slot--empty" aria-hidden="true">
            <span className="bracket__placeholder">TBD</span>
          </div>
          <div className="bracket__slot bracket__slot--empty" aria-hidden="true">
            <span className="bracket__placeholder">TBD</span>
          </div>
        </div>
      );
  }
}

function RoundColumn({ round, isFinal }: { round: BracketRound; isFinal: boolean }) {
  return (
    <section
      className={`bracket__round${isFinal ? " bracket__round--final" : ""}`}
      aria-label={round.label}
    >
      <h3 className="bracket__round-label">{round.label}</h3>
      <div className="bracket__column">
        {round.matches.map((match, i) => (
          <MatchupView key={`${round.round}-${i}`} match={match} />
        ))}
      </div>
    </section>
  );
}

export default function Bracket({ model }: { model: BracketModel }) {
  if (model.rounds.length === 0) return null;

  return (
    <div className="bracket" role="region" aria-label="Tournament bracket">
      <div className="bracket__track">
        {model.rounds.map((round) => (
          <RoundColumn key={round.round} round={round} isFinal={round.isFinal} />
        ))}
      </div>
      {model.champion && (
        <div className="bracket__champion">
          <span className="bracket__champion-label">Champion</span>
          <ChannelIdentity channel={model.champion} state="won" />
        </div>
      )}
    </div>
  );
}