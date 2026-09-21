// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Result from "./Result";
import { advance, createGame } from "../game/game";
import type { Channel } from "../game/types";

const alwaysZero = () => 0;

function channel(
  id: string,
  title = `Channel ${id}`,
  thumbnailUrl?: string,
): Channel {
  return { id, title, thumbnailUrl, channelUrl: `https://youtube.com/channel/${id}` };
}

describe("Result", () => {
  it("shows the winner name, heading, and channel link", () => {
    const game = advance(
      createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero),
      "left",
    );
    const winner = game.allChannels[0]!;
    render(<Result game={game} onPlayAgain={vi.fn()} onStartOver={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Your Favorite Channel" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: winner.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View on YouTube" })).toHaveAttribute(
      "href",
      winner.channelUrl,
    );
  });

  it("renders the winner thumbnail with an accessible name", () => {
    const game = advance(
      createGame(
        [
          channel("a", "Alpha", "https://i.ytimg.com/a.jpg"),
          channel("b", "Beta", "https://i.ytimg.com/b.jpg"),
        ],
        alwaysZero,
      ),
      "left",
    );
    const winner = game.allChannels[0]!;
    expect(winner.thumbnailUrl).toBeTruthy();
    render(<Result game={game} onPlayAgain={vi.fn()} onStartOver={vi.fn()} />);
    expect(screen.getByAltText(`${winner.title} thumbnail`)).toBeInTheDocument();
    expect(document.querySelectorAll(".thumbnail--placeholder")).toHaveLength(0);
  });

  it("renders a placeholder when the winner has no thumbnail", () => {
    const game = advance(
      createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero),
      "left",
    );
    render(<Result game={game} onPlayAgain={vi.fn()} onStartOver={vi.fn()} />);
    expect(document.querySelectorAll(".thumbnail--placeholder")).toHaveLength(1);
    expect(screen.queryByAltText("Alpha thumbnail")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Beta thumbnail")).not.toBeInTheDocument();
  });

  it("fires onPlayAgain and onStartOver actions", () => {
    const game = advance(
      createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero),
      "left",
    );
    const onPlayAgain = vi.fn();
    const onStartOver = vi.fn();
    render(<Result game={game} onPlayAgain={onPlayAgain} onStartOver={onStartOver} />);

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Start Over with Updated Subscriptions" }),
    );
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});