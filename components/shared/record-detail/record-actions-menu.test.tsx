/**
 * Smoke tests for RecordActionsMenu (Track C).
 *
 * Behavior is exercised in `use-record-actions.test.tsx` via the hook —
 * Radix DropdownMenu's Portal rendering does not play well with
 * happy-dom, so the menu's interactive paths are tested through the
 * hook. Here we only assert the trigger + empty-state contract.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RecordActionsMenu } from "./record-actions-menu";
import type { RecordAction } from "./types";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        is_admin: false,
        is_system_admin: false,
        roles: ["org_admin"],
        permissions: ["users.update"],
      },
    },
    status: "authenticated",
  }),
}));

interface DemoRecord {
  id: number;
  name: string;
}

const RECORD: DemoRecord = { id: 1, name: "Demo" };

beforeEach(() => {});
afterEach(cleanup);

describe("RecordActionsMenu", () => {
  it("renders nothing when no actions are visible", () => {
    const { container } = render(
      <RecordActionsMenu record={RECORD} actions={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("hides the trigger when every action is gated out", () => {
    // viewer session → action requires system_admin → hidden
    const actions: RecordAction<DemoRecord>[] = [
      {
        id: "delete",
        kind: "delete",
        label: "Delete",
        requiredRoles: ["system_admin"],
        destructive: true,
        onInvoke: () => {},
      },
    ];
    const { container } = render(
      <RecordActionsMenu record={RECORD} actions={actions} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the trigger when at least one action is visible", () => {
    const actions: RecordAction<DemoRecord>[] = [
      { id: "view", kind: "view", label: "View", onInvoke: () => {} },
    ];
    render(<RecordActionsMenu record={RECORD} actions={actions} />);
    expect(screen.getByTestId("record-actions-trigger")).toBeTruthy();
  });

  it("trigger has accessible label", () => {
    const actions: RecordAction<DemoRecord>[] = [
      { id: "view", kind: "view", label: "View", onInvoke: () => {} },
    ];
    render(
      <RecordActionsMenu
        record={RECORD}
        actions={actions}
        triggerAriaLabel="User actions"
      />,
    );
    expect(
      screen.getByRole("button", { name: /User actions/i }),
    ).toBeTruthy();
  });
});
