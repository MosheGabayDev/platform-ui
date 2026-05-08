/**
 * Message — single chat bubble. Pure presentational; tests cover
 * role-driven layout flip + icon swap.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Message } from "./message";
import type { Message as MessageType } from "@/lib/hooks/use-assistant-session";

afterEach(cleanup);

const mkMessage = (over: Partial<MessageType> = {}): MessageType => ({
  id: "m1",
  role: "user",
  content: "Hello",
  timestamp: Date.now(),
  ...over,
});

describe("Message", () => {
  it("renders the message content", () => {
    render(<Message message={mkMessage({ content: "Test body" })} />);
    expect(screen.getByText("Test body")).toBeTruthy();
  });

  it("user role: row direction is flex-row-reverse + bg-primary bubble", () => {
    const { container } = render(<Message message={mkMessage({ role: "user" })} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("flex-row-reverse");
    expect(container.querySelector(".bg-primary")).toBeTruthy();
  });

  it("assistant role: row direction is flex-row + bg-muted bubble", () => {
    const { container } = render(<Message message={mkMessage({ role: "assistant" })} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("flex-row");
    expect(root.className).not.toContain("flex-row-reverse");
    expect(container.querySelector(".bg-muted")).toBeTruthy();
  });

  it("data-role attribute mirrors message.role for downstream styling", () => {
    const { container } = render(<Message message={mkMessage({ role: "user" })} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-role")).toBe("user");
  });

  it("renders an icon (User for user, Sparkles for assistant)", () => {
    const { container, rerender } = render(<Message message={mkMessage({ role: "user" })} />);
    expect(container.querySelector("svg")).toBeTruthy();
    rerender(<Message message={mkMessage({ role: "assistant" })} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders multi-line content as plain text (no markdown render in this primitive)", () => {
    render(<Message message={mkMessage({ content: "line one\nline two" })} />);
    expect(screen.getByText(/line one/)).toBeTruthy();
  });
});
