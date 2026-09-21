// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Landing from "./Landing";

describe("Landing", () => {
  it("links to the privacy page", () => {
    render(<Landing onConnect={() => {}} />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });

  it("calls onConnect when Connect YouTube is clicked", () => {
    const onConnect = vi.fn();
    render(<Landing onConnect={onConnect} />);
    fireEvent.click(screen.getByRole("button", { name: "Connect YouTube" }));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
});