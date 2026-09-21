// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorScreen from "./ErrorScreen";

describe("ErrorScreen", () => {
  it("renders the title, message, and primary action", () => {
    const onRetry = vi.fn();
    render(
      <ErrorScreen
        title="Oops"
        message="Something broke."
        primaryAction={{ label: "Try Again", onClick: onRetry }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Oops" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Something broke.");
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the secondary action when provided", () => {
    const secondary = vi.fn();
    render(
      <ErrorScreen
        title="Oops"
        message="Something broke."
        primaryAction={{ label: "Try Again", onClick: vi.fn() }}
        secondaryAction={{ label: "More Info", onClick: secondary }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "More Info" }));
    expect(secondary).toHaveBeenCalledTimes(1);
  });

  it("omits the secondary action when not provided", () => {
    render(
      <ErrorScreen
        title="Oops"
        message="Something broke."
        primaryAction={{ label: "Try Again", onClick: vi.fn() }}
      />,
    );
    expect(screen.queryByRole("button", { name: "More Info" })).not.toBeInTheDocument();
  });
});