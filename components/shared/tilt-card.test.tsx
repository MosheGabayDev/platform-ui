/**
 * TiltCard + CursorGlow smoke tests (batch 158).
 *
 * Both are visual hover-effect primitives. Coverage was 27%/31%
 * because mousemove handlers weren't exercised. happy-dom doesn't
 * support `requestAnimationFrame` natively the way browsers do, so
 * we stub it to flush synchronously and assert that the inline
 * transform / CSS custom properties land on the host element.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TiltCard } from "./tilt-card";
import { CursorGlow } from "./cursor-glow";

beforeEach(() => {
  vi.stubGlobal(
    "requestAnimationFrame",
    (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    },
  );
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("TiltCard", () => {
  it("renders children", () => {
    render(<TiltCard><span data-testid="inner">hi</span></TiltCard>);
    expect(screen.getByTestId("inner")).toBeTruthy();
  });

  it("mousemove writes a perspective() transform onto the host", () => {
    const { container } = render(<TiltCard maxTilt={10}>x</TiltCard>);
    const host = container.firstElementChild as HTMLDivElement;
    // Stub getBoundingClientRect — happy-dom returns zeros otherwise.
    host.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    fireEvent.mouseMove(host, { clientX: 75, clientY: 25 });
    expect(host.style.transform).toMatch(/perspective\(800px\)/);
    expect(host.style.transform).toMatch(/rotateY\(/);
    expect(host.style.transform).toMatch(/scale3d/);
  });

  it("mouseleave resets the transform to the neutral pose", () => {
    const { container } = render(<TiltCard>x</TiltCard>);
    const host = container.firstElementChild as HTMLDivElement;
    host.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    fireEvent.mouseMove(host, { clientX: 75, clientY: 25 });
    fireEvent.mouseLeave(host);
    expect(host.style.transform).toMatch(/rotateY\(0deg\)/);
    expect(host.style.transform).toMatch(/rotateX\(0deg\)/);
    expect(host.style.transform).toMatch(/scale3d\(1,1,1\)/);
  });
});

describe("CursorGlow", () => {
  it("renders children", () => {
    render(<CursorGlow><span data-testid="g">y</span></CursorGlow>);
    expect(screen.getByTestId("g")).toBeTruthy();
  });

  it("mousemove sets --glow-x, --glow-y, --glow-opacity custom properties", () => {
    const { container } = render(<CursorGlow size={200}>x</CursorGlow>);
    const host = container.firstElementChild as HTMLDivElement;
    host.getBoundingClientRect = () =>
      ({ left: 10, top: 20, width: 100, height: 100 }) as DOMRect;
    fireEvent.mouseMove(host, { clientX: 60, clientY: 80 });
    expect(host.style.getPropertyValue("--glow-x")).toBe("50px");
    expect(host.style.getPropertyValue("--glow-y")).toBe("60px");
    expect(host.style.getPropertyValue("--glow-opacity")).toBe("1");
  });

  it("mouseleave hides the glow (opacity=0)", () => {
    const { container } = render(<CursorGlow>x</CursorGlow>);
    const host = container.firstElementChild as HTMLDivElement;
    host.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    fireEvent.mouseMove(host, { clientX: 50, clientY: 50 });
    fireEvent.mouseLeave(host);
    expect(host.style.getPropertyValue("--glow-opacity")).toBe("0");
  });
});
