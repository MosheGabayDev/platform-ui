/**
 * EmptyState — animated icon + title + description + optional action.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "./empty-state";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState icon={Inbox} title="No items" description="Try again" />);
    expect(screen.getByText("No items")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
  it("renders without description when not provided", () => {
    render(<EmptyState icon={Inbox} title="Empty" />);
    expect(screen.getByText("Empty")).toBeTruthy();
  });
  it("renders action button and calls onClick", () => {
    const fn = vi.fn();
    render(
      <EmptyState
        icon={Inbox}
        title="x"
        action={{ label: "Reload", onClick: fn }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("supports sm size class", () => {
    const { container } = render(<EmptyState icon={Inbox} title="x" size="sm" />);
    expect(container.querySelector(".py-8")).toBeTruthy();
  });
  it("supports lg size class", () => {
    const { container } = render(<EmptyState icon={Inbox} title="x" size="lg" />);
    expect(container.querySelector(".py-16")).toBeTruthy();
  });
});
