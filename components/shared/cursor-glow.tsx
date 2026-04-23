"use client";

import { useRef, useCallback, ReactNode } from "react";

interface CursorGlowProps {
  children: ReactNode;
  className?: string;
  size?: number;
}

export function CursorGlow({ children, className = "", size = 300 }: CursorGlowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
    el.style.setProperty("--glow-opacity", "1");
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--glow-opacity", "0");
  }, []);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        "--glow-x": "50%",
        "--glow-y": "50%",
        "--glow-opacity": "0",
        "--glow-size": `${size}px`,
      } as React.CSSProperties}
    >
      {/* Glow overlay — desktop only via pointer:fine */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: "var(--glow-opacity)",
          background: `radial-gradient(var(--glow-size) circle at var(--glow-x) var(--glow-y), oklch(0.6 0.22 264 / 12%), transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
