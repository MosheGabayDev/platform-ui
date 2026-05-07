/**
 * Smoke tests for the detail-view primitives:
 * BoolBadge, InfoRow, DetailSection, DetailHeaderCard, DetailLoadingSkeleton,
 * DetailBackButton.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Mail } from "lucide-react";
import { BoolBadge } from "./bool-badge";
import { InfoRow } from "./info-row";
import { DetailSection } from "./detail-section";
import { DetailHeaderCard } from "./detail-header-card";
import { DetailLoadingSkeleton } from "./detail-loading-skeleton";
import { DetailBackButton } from "./detail-back-button";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
  pushMock.mockReset();
});

describe("BoolBadge", () => {
  it("renders default Hebrew yes label when true", () => {
    render(<BoolBadge value={true} />);
    expect(screen.getByText("כן")).toBeTruthy();
  });
  it("renders default Hebrew no label when false", () => {
    render(<BoolBadge value={false} />);
    expect(screen.getByText("לא")).toBeTruthy();
  });
  it("respects custom labels", () => {
    render(<BoolBadge value={true} yesLabel="Yes" noLabel="No" />);
    expect(screen.getByText("Yes")).toBeTruthy();
  });
});

describe("InfoRow", () => {
  it("renders icon, label and value", () => {
    render(<InfoRow icon={Mail} label="Email" value="user@x.com" />);
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("user@x.com")).toBeTruthy();
  });
  it("renders em-dash when value is null", () => {
    render(<InfoRow icon={Mail} label="Email" value={null} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});

describe("DetailSection", () => {
  it("renders title and children", () => {
    render(
      <DetailSection title="Section">
        <span>child-content</span>
      </DetailSection>,
    );
    expect(screen.getByText("Section")).toBeTruthy();
    expect(screen.getByText("child-content")).toBeTruthy();
  });
  it("merges custom className", () => {
    const { container } = render(
      <DetailSection title="x" className="custom-cls">child</DetailSection>,
    );
    expect(container.querySelector(".custom-cls")).toBeTruthy();
  });
});

describe("DetailHeaderCard", () => {
  it("renders title only", () => {
    render(<DetailHeaderCard title="Title" avatar={null} />);
    expect(screen.getByText("Title")).toBeTruthy();
  });
  it("renders subtitle and badges + avatar slots", () => {
    render(
      <DetailHeaderCard
        title="T"
        subtitle="sub-line"
        badges={<span>BADGE</span>}
        avatar={<span>AV</span>}
      />,
    );
    expect(screen.getByText("sub-line")).toBeTruthy();
    expect(screen.getByText("BADGE")).toBeTruthy();
    expect(screen.getByText("AV")).toBeTruthy();
  });
  it("subtitleMono adds font-mono class to subtitle", () => {
    const { container } = render(
      <DetailHeaderCard title="T" subtitle="abc" subtitleMono avatar={null} />,
    );
    expect(container.querySelector(".font-mono")).toBeTruthy();
  });
});

describe("DetailLoadingSkeleton", () => {
  it("renders pulse skeleton container", () => {
    const { container } = render(<DetailLoadingSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});

describe("DetailBackButton", () => {
  it("renders default Hebrew label and pushes target href on click", () => {
    render(<DetailBackButton href="/users" />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("חזרה לרשימה");
    fireEvent.click(btn);
    expect(pushMock).toHaveBeenCalledWith("/users");
  });
  it("respects custom label", () => {
    render(<DetailBackButton href="/x" label="Back" />);
    expect(screen.getByText("Back")).toBeTruthy();
  });
});
