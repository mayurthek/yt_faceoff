export default function Privacy() {
  return (
    <main className="screen">
      <p className="wordmark">Face-Off</p>
      <h1>Privacy</h1>
      <div className="prose">
        <p>
          Face-Off is a local, read-only tool. It compares the YouTube channels you
          subscribe to and helps you pick one winner.
        </p>
        <h2>What we access</h2>
        <ul>
          <li>
            Read-only access to your YouTube subscription list via{" "}
            <code>youtube.readonly</code>. We never request write access.
          </li>
          <li>Channel names, thumbnails, and channel URLs only.</li>
        </ul>
        <h2>What we store</h2>
        <ul>
          <li>
            OAuth tokens are kept in the server&apos;s memory for the current session
            only and are never exposed to client-side code.
          </li>
          <li>
            Subscription data is used for the current session only; there is no
            account, database, or long-term storage. Restarting the server clears all
            sessions.
          </li>
          <li>
            A signed session cookie is used to keep you connected during the session.
          </li>
        </ul>
        <h2>What we never do</h2>
        <ul>
          <li>We do not store your Google password.</li>
          <li>We do not sell or share your subscription data.</li>
          <li>We do not post, edit, or delete anything on your account.</li>
        </ul>
        <h2>Removing access</h2>
        <p>
          Closing the tab or restarting the server ends your session. You can also revoke
          access any time from your Google account&apos;s third-party access settings.
        </p>
        <a className="link-button" href="/">
          Back to Face-Off
        </a>
      </div>
    </main>
  );
}