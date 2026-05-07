/**
 * ErrorBoundary — class component that catches render errors.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "./error-boundary";

afterEach(cleanup);

function Boom(): React.ReactElement {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <span>safe</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe")).toBeTruthy();
  });

  it("renders fallback UI on error", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("אירעה שגיאה בלתי צפויה")).toBeTruthy();
    expect(screen.getByText(/pui-/)).toBeTruthy();
    errSpy.mockRestore();
  });

  it("renders custom fallback when provided", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<span>CUSTOM</span>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("CUSTOM")).toBeTruthy();
    errSpy.mockRestore();
  });

  it("retry button resets error state", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    function Maybe() {
      if (shouldThrow) throw new Error("once");
      return <span>recovered</span>;
    }
    render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>,
    );
    expect(screen.getByText("אירעה שגיאה בלתי צפויה")).toBeTruthy();
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "נסה שוב" }));
    expect(screen.getByText("recovered")).toBeTruthy();
    errSpy.mockRestore();
  });
});
