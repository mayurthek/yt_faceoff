// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Ready from "./Ready";

describe("Ready", () => {
  it("shows the empty state with Refresh and View YouTube when there are no channels", () => {
    const onReconnect = vi.fn();
    render(<Ready channelCount={0} onStart={vi.fn()} onReconnect={onReconnect} />);
    expect(
      screen.getByRole("heading", {
        name: "We could not find any subscribed channels.",
      }),
    ).toBeInTheDocument();
    const refresh = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(refresh);
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "View YouTube" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/feed/channels",
    );
  });

  it("shows the single-channel message with Refresh", () => {
    render(<Ready channelCount={1} onStart={vi.fn()} onReconnect={vi.fn()} />);
    expect(
      screen.getByRole("heading", {
        name: "You need at least two subscribed channels to start a face-off.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Face-Off" }),
    ).not.toBeInTheDocument();
  });

  it("shows the channel count with Start and Reconnect for two or more", () => {
    render(<Ready channelCount={5} onStart={vi.fn()} onReconnect={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "You have 5 subscribed channels." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Face-Off" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect YouTube" })).toBeInTheDocument();
  });

  it("uses the singular form for one channel count label", () => {
    render(<Ready channelCount={2} onStart={vi.fn()} onReconnect={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "You have 2 subscribed channels." }),
    ).toBeInTheDocument();
  });

  it("fires onStart when Start Face-Off is clicked", () => {
    const onStart = vi.fn();
    render(<Ready channelCount={3} onStart={onStart} onReconnect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Face-Off" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("fires onReconnect when Reconnect YouTube is clicked", () => {
    const onReconnect = vi.fn();
    render(<Ready channelCount={3} onStart={vi.fn()} onReconnect={onReconnect} />);
    fireEvent.click(screen.getByRole("button", { name: "Reconnect YouTube" }));
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});