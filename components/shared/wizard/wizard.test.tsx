/**
 * Wizard primitive component tests (cap 15).
 *
 * Covers: step rendering, next/back navigation, validation gating,
 * optional/skip semantics, finish flow with async onComplete.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { Wizard } from "./wizard";
import type { WizardConfig } from "@/lib/modules/wizard/types";

interface S {
  name: string;
}

function makeConfig(overrides: Partial<WizardConfig<S>> = {}): WizardConfig<S> {
  return {
    storageKey: `wizard:test:${Math.random().toString(36).slice(2)}`,
    title: "Test Wizard",
    initialState: { name: "" },
    onComplete: vi.fn(),
    steps: [
      {
        id: "step1",
        label: "Step 1",
        render: ({ state, update }) => (
          <input
            aria-label="name-input"
            value={state.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        ),
        validate: (s) => (s.name.length < 2 ? "Name too short" : null),
      },
      {
        id: "step2",
        label: "Step 2",
        render: () => <div>step 2 body</div>,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(cleanup);

describe("Wizard primitive", () => {
  it("renders the first step body and step indicator", async () => {
    render(<Wizard config={makeConfig()} preferHebrew={false} />);
    await waitFor(() =>
      expect(screen.getByLabelText("name-input")).toBeTruthy(),
    );
    // "Step 1" appears in indicator AND H2 — both should exist.
    expect(screen.getAllByText("Step 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Step 2").length).toBeGreaterThanOrEqual(1);
  });

  it("Next is disabled while validator returns an error", async () => {
    render(<Wizard config={makeConfig()} preferHebrew={false} />);
    const next = await screen.findByRole("button", { name: /Next step/i });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Name too short")).toBeTruthy();
  });

  it("Next becomes enabled when validator passes", async () => {
    render(<Wizard config={makeConfig()} preferHebrew={false} />);
    const input = await screen.findByLabelText("name-input");
    fireEvent.change(input, { target: { value: "Acme" } });
    const next = screen.getByRole("button", { name: /Next step/i });
    await waitFor(() => expect((next as HTMLButtonElement).disabled).toBe(false));
  });

  it("clicking Next advances to the next step", async () => {
    render(<Wizard config={makeConfig()} preferHebrew={false} />);
    const input = await screen.findByLabelText("name-input");
    fireEvent.change(input, { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: /Next step/i }));
    await waitFor(() => expect(screen.getByText("step 2 body")).toBeTruthy());
  });

  it("Back button appears only after first step", async () => {
    render(<Wizard config={makeConfig()} preferHebrew={false} />);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    const input = await screen.findByLabelText("name-input");
    fireEvent.change(input, { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: /Next step/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Back" })).toBeTruthy(),
    );
  });

  it("Finish triggers onComplete and shows the Finish label on last step", async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <Wizard
        config={makeConfig({ onComplete })}
        preferHebrew={false}
      />,
    );
    const input = await screen.findByLabelText("name-input");
    fireEvent.change(input, { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: /Next step/i }));
    const finish = await screen.findByRole("button", { name: /Finish/i });
    fireEvent.click(finish);
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({ name: "Acme" }),
    );
  });

  it("optional step renders Skip instead of Next", async () => {
    const config = makeConfig();
    config.steps[0]!.optional = true;
    render(<Wizard config={config} preferHebrew={false} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Skip step/i })).toBeTruthy(),
    );
  });

  it("hideWhen step is filtered out of the indicator", async () => {
    const config = makeConfig();
    config.steps[1] = {
      ...config.steps[1]!,
      hideWhen: () => true,
    };
    render(<Wizard config={config} preferHebrew={false} />);
    await waitFor(() => expect(screen.queryByText("Step 2")).toBeNull());
  });

  it("Cancel button is always visible", async () => {
    render(<Wizard config={makeConfig()} preferHebrew={false} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Cancel wizard/i })).toBeTruthy(),
    );
  });
});
