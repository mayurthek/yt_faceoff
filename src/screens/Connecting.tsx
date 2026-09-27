import Wordmark from "./Wordmark";

export default function Connecting() {
  return (
    <main className="screen">
      <Wordmark />
      <h1>Loading your subscribed channels…</h1>
      <p role="status">Fetching your YouTube subscriptions.</p>
    </main>
  );
}