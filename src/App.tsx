import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, createAdvanceGuard, playAgain } from "./game/game";
import type { Channel, FaceOffGame, Side } from "./game/types";
import {
  connectYouTube,
  loadSubscriptions,
  restoreSession,
  usesMockData,
  ApiError,
} from "./dataClient";
import Landing from "./screens/Landing";
import Connecting from "./screens/Connecting";
import Ready from "./screens/Ready";
import Matchup from "./screens/Matchup";
import Result from "./screens/Result";
import ErrorScreen from "./screens/ErrorScreen";

type Screen =
  | { name: "landing" }
  | { name: "connecting" }
  | { name: "ready"; channels: Channel[] }
  | { name: "playing"; game: FaceOffGame }
  | { name: "result"; game: FaceOffGame }
  | {
      name: "error";
      title: string;
      message: string;
      actionLabel: string;
      onRetry: () => void;
    };

function needsOAuth(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === "oauth_cancelled" ||
      error.kind === "oauth_failed" ||
      error.kind === "session_expired")
  );
}

function toErrorScreen(error: unknown, onRetry: () => void): Screen {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case "oauth_cancelled":
        return {
          name: "error",
          title: "YouTube access was cancelled.",
          message: "Connect again when you are ready.",
          actionLabel: "Try Again",
          onRetry,
        };
      case "session_expired":
        return {
          name: "error",
          title: "Your YouTube connection expired.",
          message: "Reconnect to keep playing.",
          actionLabel: "Reconnect YouTube",
          onRetry,
        };
      case "network":
        return {
          name: "error",
          title: "We lost the connection.",
          message: "Your current game is still here.",
          actionLabel: "Retry",
          onRetry,
        };
      case "oauth_failed":
        return {
          name: "error",
          title: "We could not connect to YouTube.",
          message: "Please try again.",
          actionLabel: "Try Again",
          onRetry,
        };
      case "api_failure":
        return {
          name: "error",
          title: "We could not load your subscriptions right now.",
          message: "Please try again.",
          actionLabel: "Try Again",
          onRetry,
        };
      case "no_subscriptions":
        return {
          name: "error",
          title: "We could not find any subscribed channels.",
          message: "Check your subscriptions on YouTube and try again.",
          actionLabel: "Try Again",
          onRetry,
        };
    }
  }
  return {
    name: "error",
    title: "Something went wrong.",
    message: "Please try again.",
    actionLabel: "Try Again",
    onRetry,
  };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "landing" });
  const guardRef = useRef(createAdvanceGuard());
  const screenRef = useRef(screen);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  const reachReady = useCallback(async (forceReconnect: boolean) => {
    setScreen({ name: "connecting" });
    try {
      if (forceReconnect) {
        const continued = await connectYouTube();
        if (!continued) return;
      }
      const channels = await loadSubscriptions();
      setScreen({ name: "ready", channels });
    } catch (error) {
      const retry = () => void reachReady(needsOAuth(error));
      setScreen(toErrorScreen(error, retry));
    }
  }, []);

  useEffect(() => {
    if (usesMockData()) return;

    const params = new URLSearchParams(window.location.search);

    if (params.get("oauth_error")) {
      const kind =
        params.get("oauth_error") === "oauth_cancelled"
          ? "oauth_cancelled"
          : "oauth_failed";
      window.history.replaceState(null, "", window.location.pathname);
      setScreen(
        toErrorScreen(new ApiError(kind, "OAuth round-trip failed"), () => {
          void reachReady(true);
        }),
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const authenticated = await restoreSession();
        if (!authenticated || cancelled) return;
        await reachReady(false);
      } catch (error) {
        if (!cancelled && needsOAuth(error)) {
          setScreen(
            toErrorScreen(error, () => {
              void reachReady(true);
            }),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reachReady]);

  const startFaceOff = useCallback(() => {
    setScreen((prev) =>
      prev.name === "ready" ? { name: "playing", game: createGame(prev.channels) } : prev,
    );
  }, []);

  const choose = useCallback((side: Side) => {
    const prev = screenRef.current;
    if (prev.name !== "playing") return;
    const next = guardRef.current(prev.game, side);
    if (!next || next === prev.game) return;
    setScreen(
      next.status === "finished"
        ? { name: "result", game: next }
        : { name: "playing", game: next },
    );
  }, []);

  const startAgain = useCallback(() => {
    setScreen((prev) => {
      if (prev.name !== "result") return prev;
      return { name: "playing", game: playAgain(prev.game) };
    });
  }, []);

  switch (screen.name) {
    case "landing":
      return <Landing onConnect={() => void reachReady(true)} />;
    case "connecting":
      return <Connecting />;
    case "ready":
      return (
        <Ready
          channelCount={screen.channels.length}
          onStart={startFaceOff}
          onReconnect={() => void reachReady(true)}
        />
      );
    case "playing":
      return <Matchup game={screen.game} onChoose={choose} />;
    case "result":
      return (
        <Result
          game={screen.game}
          onPlayAgain={startAgain}
          onStartOver={() => void reachReady(false)}
        />
      );
    case "error":
      return (
        <ErrorScreen
          title={screen.title}
          message={screen.message}
          primaryAction={{ label: screen.actionLabel, onClick: screen.onRetry }}
        />
      );
  }
}