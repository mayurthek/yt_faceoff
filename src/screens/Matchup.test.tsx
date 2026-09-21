// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Matchup from "./Matchup";
import { createGame } from "../game/game";
import type { Channel } from "../game/types";

function channel(id: string, title = `Channel ${id}`): Channel {
  return { id, title, channelUrl: `https://youtube.com/channel/${id}` };
}

const alwaysZero = () => 0;
const keepOrder = () => 0.9999;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Matchup", () => {
  it("renders two cards with accessible names containing each channel name", () => {
    const game = createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero);
    render(<Matchup game={game} onChoose={() => {}} />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose Beta" })).toBeInTheDocument();
  });

  it("shows round and match progress", () => {
    const game = createGame(
      [channel("a"), channel("b"), channel("c"), channel("d")],
      alwaysZero,
    );
    render(<Matchup game={game} onChoose={() => {}} />);
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("Match 1 of 3")).toBeInTheDocument();
  });

  it("chooses the left channel when its button is clicked", () => {
    const game = createGame([channel("a", "Alpha"), channel("b", "Beta")], keepOrder);
    const onChoose = vi.fn();
    render(<Matchup game={game} onChoose={onChoose} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Alpha" }));
    expect(onChoose).toHaveBeenCalledWith("left");
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("chooses the right channel when its button is clicked", () => {
    const game = createGame([channel("a", "Alpha"), channel("b", "Beta")], keepOrder);
    const onChoose = vi.fn();
    render(<Matchup game={game} onChoose={onChoose} />);

    fireEvent.click(screen.getByRole("button", { name: "Choose Beta" }));
    expect(onChoose).toHaveBeenCalledWith("right");
  });

  it("chooses with the Left and Right arrow keys", async () => {
    const user = userEvent.setup();
    const game = createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero);
    const onChoose = vi.fn();
    render(<Matchup game={game} onChoose={onChoose} />);

    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowRight}");
    expect(onChoose).toHaveBeenCalledTimes(2);
    expect(onChoose).toHaveBeenNthCalledWith(1, "left");
    expect(onChoose).toHaveBeenNthCalledWith(2, "right");
  });

  it("renders a placeholder for channels without a thumbnail", () => {
    const game = createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero);
    render(<Matchup game={game} onChoose={() => {}} />);
    expect(document.querySelectorAll(".thumbnail--placeholder")).toHaveLength(2);
  });

  it("does not render when the matchup is incomplete", () => {
    const game = createGame([channel("a")], alwaysZero);
    render(<Matchup game={game} onChoose={() => {}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});