/**
 * PageShell — header layout primitive used by every list page.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Users } from "lucide-react";
import { PageShell } from "./page-shell";

afterEach(cleanup);

describe("PageShell", () => {
  it("renders icon, title, subtitle and children", () => {
    render(
      <PageShell icon={Users} title="Users" subtitle="manage">
        <div>BODY</div>
      </PageShell>,
    );
    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.getByText("manage")).toBeTruthy();
    expect(screen.getByText("BODY")).toBeTruthy();
  });

  it("omits subtitle when not provided", () => {
    render(
      <PageShell icon={Users} title="X">
        <div>BODY</div>
      </PageShell>,
    );
    expect(screen.queryByText("manage")).toBeNull();
  });

  it("renders stats and actions slots", () => {
    render(
      <PageShell
        icon={Users}
        title="X"
        stats={<span>STATS</span>}
        actions={<button>ACT</button>}
      >
        <div>BODY</div>
      </PageShell>,
    );
    expect(screen.getByText("STATS")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ACT" })).toBeTruthy();
  });

  it("renders mobile bottom-nav padding (CLAUDE.md hard rule)", () => {
    const { container } = render(
      <PageShell icon={Users} title="X">
        <div />
      </PageShell>,
    );
    expect(container.querySelector(".pb-20")).toBeTruthy();
  });
});
