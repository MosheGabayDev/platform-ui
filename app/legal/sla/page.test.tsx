/**
 * SLA page — public legal content. Renders the 3-tier table + 4 sections
 * + draft banner.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import SlaPage from "./page";

afterEach(cleanup);

describe("SlaPage", () => {
  it("renders the title", () => {
    renderWithIntl(<SlaPage />);
    expect(screen.getByText(/הסכם רמת שירות|Service Level Agreement/)).toBeTruthy();
  });

  it("shows the DRAFT banner so unreviewed copy isn't accidentally treated as final", () => {
    renderWithIntl(<SlaPage />);
    expect(screen.getByText(/טיוטה|DRAFT/)).toBeTruthy();
  });

  it("renders the 3-tier availability matrix (free / pro / enterprise)", () => {
    renderWithIntl(<SlaPage />);
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.getByText("Enterprise")).toBeTruthy();
  });

  it("renders all 4 policy section headings", () => {
    renderWithIntl(<SlaPage />);
    // 1 table title h2 + 4 section h2s = 5 total
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });

  it("includes a back link to root + contact mailto reference", () => {
    renderWithIntl(<SlaPage />);
    expect(
      screen.getByRole("link", { name: /Platform Engineer/ }).getAttribute("href"),
    ).toBe("/");
    expect(screen.getByText(/enterprise@platform\.local/)).toBeTruthy();
  });
});
