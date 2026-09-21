interface ReadyProps {
  channelCount: number;
  onStart: () => void;
  onReconnect: () => void;
}

export default function Ready({ channelCount, onStart, onReconnect }: ReadyProps) {
  if (channelCount === 0) {
    return (
      <main className="screen">
        <p className="wordmark">Face-Off</p>
        <h1>We could not find any subscribed channels.</h1>
        <div className="ready__actions">
          <button type="button" className="button button--primary" onClick={onReconnect}>
            Refresh
          </button>
          <a
            className="button button--ghost"
            href="https://www.youtube.com/feed/channels"
            target="_blank"
            rel="noreferrer"
          >
            View YouTube
          </a>
        </div>
      </main>
    );
  }

  if (channelCount === 1) {
    return (
      <main className="screen">
        <p className="wordmark">Face-Off</p>
        <h1>You need at least two subscribed channels to start a face-off.</h1>
        <div className="ready__actions">
          <button type="button" className="button button--primary" onClick={onReconnect}>
            Refresh
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <p className="wordmark">Face-Off</p>
      <h1>
        You have {channelCount} subscribed channel{channelCount === 1 ? "" : "s"}.
      </h1>
      <div className="ready__actions">
        <button type="button" className="button button--primary" onClick={onStart}>
          Start Face-Off
        </button>
      </div>
      <button type="button" className="link-button" onClick={onReconnect}>
        Reconnect YouTube
      </button>
    </main>
  );
}