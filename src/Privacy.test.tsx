// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Privacy from "./Privacy";

describe("Privacy", () => {
  it("declares read-only access and no long-term storage", () => {
    render(<Privacy />);
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    expect(screen.getByText(/no account, database, or long-term storage/i)).toBeInTheDocument();
    expect(screen.getByText(/we do not sell or share your subscription data/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Face-Off" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});