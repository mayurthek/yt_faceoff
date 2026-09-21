// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { Channel } from "./game/types";

vi.mock("./mock", () => ({
  fetchMockSubscriptions: vi.fn(async () => [
    { id: "a", title: "Alpha", channelUrl: "https://youtube.com/channel/a" },
    { id: "b", title: "Beta", channelUrl: "https://youtube.com/channel/b" },
    { id: "c", title: "Gamma", channelUrl: "https://youtube.com/channel/c" },
  ] satisfies Channel[]),
}));

describe("App full flow", () => {
  it("plays a whole face-off with the keyboard and shows the winner", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Find Your Favorite YouTube Channel" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Connect YouTube" }));
    expect(await screen.findByText("You have 3 subscribed channels.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Face-Off" }));
    expect(await screen.findByText("Match 1 of 2")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(await screen.findByText("Match 2 of 2")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Your Favorite Channel")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your Favorite Channel" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
    expect(await screen.findByText("Match 1 of 2")).toBeInTheDocument();
  });

  it("starts over with updated subscriptions from the result screen", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Connect YouTube" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start Face-Off" }));
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowLeft}");
    await screen.findByText("Your Favorite Channel");

    fireEvent.click(
      screen.getByRole("button", { name: "Start Over with Updated Subscriptions" }),
    );
    expect(await screen.findByText("You have 3 subscribed channels.")).toBeInTheDocument();
  });
});