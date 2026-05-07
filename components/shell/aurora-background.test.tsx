/**
 * AuroraBackground — fixed CSS-only blob layer.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AuroraBackground } from "./aurora-background";

afterEach(cleanup);

describe("AuroraBackground", () => {
  it("renders 3 aurora blobs in a fixed aria-hidden container", () => {
    const { container } = render(<AuroraBackground />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.classList.contains("fixed")).toBe(true);
    expect(container.querySelectorAll(".aurora-blob").length).toBe(3);
  });
});
