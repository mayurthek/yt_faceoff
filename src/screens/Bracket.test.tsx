// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Bracket from "./Bracket";
import { buildBracket } from "../bracket";
import { advance, createGame } from "../game/game";
import type { Channel } from "../game/types";

const alwaysZero = () => 0;

function channel(
  id: string,
  title = `Channel ${id}`,
  subscriberCount?: number,
): Channel {
  return {
    id,
    title,
    subscriberCount,
    thumbnailUrl: `https://i.ytimg.com/${id}.jpg`,
    channelUrl: `https://youtube.com/channel/${id}`,
  };
}

describe("Bracket", () => {
  it("renders round labels, channel names, and a VS badge for the active matchup", () => {
    const game = createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero);
    render(<Bracket model={buildBracket(game)} />);

    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
    expect(screen.getByLabelText("Current matchup")).toBeInTheDocument();
  });

  it("shows subscriber counts when present", () => {
    const game = createGame(
      [channel("a", "Alpha", 25000000), channel("b", "Beta", 18400000)],
      alwaysZero,
    );
    render(<Bracket model={buildBracket(game)} />);
    expect(screen.getByText("25M subscribers")).toBeInTheDocument();
    expect(screen.getByText("18.4M subscribers")).toBeInTheDocument();
  });

  it("reports the champion after the tournament finishes", () => {
    const game = advance(
      createGame([channel("a", "Alpha"), channel("b", "Beta")], alwaysZero),
      "left",
    );
    const winner = game.allChannels[0]!;
    render(<Bracket model={buildBracket(game)} />);

    expect(screen.getByText("Champion")).toBeInTheDocument();
    expect(screen.getAllByText(winner.title).length).toBeGreaterThanOrEqual(1);
  });

  it("renders future rounds as TBD placeholders", () => {
    const game = createGame(
      [channel("a"), channel("b"), channel("c"), channel("d")],
      alwaysZero,
    );
    render(<Bracket model={buildBracket(game)} />);
    expect(screen.getAllByText("TBD").length).toBeGreaterThanOrEqual(2);
  });

  it("renders nothing for an empty model", () => {
    const { container } = render(
      <Bracket model={{ rounds: [], champion: undefined }} />,
    );
    expect(screen.queryByLabelText("Tournament bracket")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});