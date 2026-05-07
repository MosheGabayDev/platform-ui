/**
 * Form primitives: PlatformForm, FormError, FormActions.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PlatformForm } from "./platform-form";
import { FormError } from "./form-error";
import { FormActions } from "./form-actions";

afterEach(cleanup);

describe("PlatformForm", () => {
  it("renders form with submit handler", () => {
    const submit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(
      <PlatformForm onSubmit={submit} ariaLabel="t-form">
        <button type="submit">Go</button>
      </PlatformForm>,
    );
    fireEvent.submit(container.querySelector("form")!);
    expect(submit).toHaveBeenCalled();
  });
  it("sets aria-busy when submitting", () => {
    const { container } = render(
      <PlatformForm onSubmit={() => {}} isSubmitting>
        <span />
      </PlatformForm>,
    );
    expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe("true");
  });
});

describe("FormError", () => {
  it("renders error text inside an alert", () => {
    render(<FormError error="Something broke" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Something broke");
  });
  it("renders nothing when error is null/undefined", () => {
    const { container } = render(<FormError error={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("FormActions", () => {
  it("renders default Hebrew labels", () => {
    render(<FormActions />);
    expect(screen.getByRole("button", { name: "שמור" })).toBeTruthy();
  });
  it("renders cancel button only when onCancel provided", () => {
    const fn = vi.fn();
    render(<FormActions onCancel={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "ביטול" }));
    expect(fn).toHaveBeenCalled();
  });
  it("disables both buttons when isSubmitting", () => {
    render(<FormActions onCancel={() => {}} isSubmitting />);
    const buttons = screen.getAllByRole("button");
    for (const b of buttons) expect((b as HTMLButtonElement).disabled).toBe(true);
  });
  it("disables submit when disabled prop set even if not submitting", () => {
    render(<FormActions disabled />);
    const submit = screen.getByRole("button", { name: "שמור" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
  it("respects custom labels", () => {
    render(<FormActions submitLabel="Save" cancelLabel="Cancel" onCancel={() => {}} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });
});
