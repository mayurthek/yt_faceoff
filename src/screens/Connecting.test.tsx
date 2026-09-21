// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Connecting from "./Connecting";

describe("Connecting", () => {
  it("shows the loading message and a status announcement", () => {
    render(<Connecting />);
    expect(
      screen.getByRole("heading", { name: "Loading your subscribed channels…" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Fetching your YouTube subscriptions.",
    );
  });
});