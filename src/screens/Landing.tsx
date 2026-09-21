interface LandingProps {
  onConnect: () => void;
}

export default function Landing({ onConnect }: LandingProps) {
  return (
    <main className="screen">
      <p className="wordmark">Face-Off</p>
      <h1>Find Your Favorite YouTube Channel</h1>
      <p className="landing__lead">
        Compare the channels you subscribe to and choose one winner.
      </p>
      <button type="button" className="button button--primary" onClick={onConnect}>
        Connect YouTube
      </button>
      <p className="privacy-note">
        Read-only access. We do not change your YouTube account.
      </p>
      <a className="link-button" href="/privacy">
        Privacy
      </a>
    </main>
  );
}