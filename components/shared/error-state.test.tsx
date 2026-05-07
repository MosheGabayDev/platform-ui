/**
 * ErrorState — maps HTTP status in error.message to user-friendly Hebrew copy.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ErrorState } from "./error-state";

afterEach(cleanup);

describe("ErrorState", () => {
  it("renders 401 message for 401 in error.message", () => {
    render(<ErrorState error={new Error("HTTP 401")} />);
    expect(screen.getByText("נדרשת התחברות מחדש")).toBeTruthy();
  });
  it("renders 403 message", () => {
    render(<ErrorState error={new Error("HTTP 403 forbidden")} />);
    expect(screen.getByText("אין הרשאה לבצע פעולה זו")).toBeTruthy();
  });
  it("renders 404 message", () => {
    render(<ErrorState error={new Error("HTTP 404 not found")} />);
    expect(screen.getByText("הפריט לא נמצא")).toBeTruthy();
  });
  it("renders raw message when no status code matches", () => {
    render(<ErrorState error={new Error("network down")} />);
    expect(screen.getByText("network down")).toBeTruthy();
  });
  it("renders default fallback for non-Error", () => {
    render(<ErrorState error={"string-error"} />);
    expect(screen.getByText("שגיאה לא ידועה")).toBeTruthy();
  });
  it("respects custom messages", () => {
    render(
      <ErrorState
        error={new Error("HTTP 401")}
        messages={{ 401: "Please log in" }}
      />,
    );
    expect(screen.getByText("Please log in")).toBeTruthy();
  });
  it("renders retry button when onRetry provided", () => {
    const fn = vi.fn();
    render(<ErrorState error={new Error("x")} onRetry={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "נסה שוב" }));
    expect(fn).toHaveBeenCalled();
  });
  it("does not render retry button when onRetry is omitted", () => {
    render(<ErrorState error={new Error("x")} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
