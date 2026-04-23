# Design System — Platform Engineer UI
> Version: 1.2 | Last updated: 2026-04-23 | Status: ACTIVE

## Visual Philosophy

**"AI Command Center"** — dark, precise, alive.
The UI should feel like a mission-control interface: authoritative, data-dense, and subtly animated.
Not a generic SaaS dashboard — a specialized tool for people who run infrastructure.

### Three principles
1. **Signal over noise** — every pixel earns its place. No decorative chrome without purpose.
2. **Alive but calm** — motion exists to communicate state, not entertain. Animations are purposeful.
3. **Depth through light** — darkness is the canvas. Color = meaning. Glow = activity/attention.

---

## Color System

### Background layers (dark mode, from back to front)

| Layer | Variable | oklch | Usage |
|---|---|---|---|
| Page bg | `--background` | `oklch(0.145 0 0)` | Body background |
| Card bg | `--card` | `oklch(0.205 0 0)` | Cards, panels |
| Elevated | `--muted` | `oklch(0.269 0 0)` | Hover states, inputs |
| Border | `--border` | `oklch(1 0 0 / 10%)` | Dividers, card borders |
| Glass | custom | card/60% + blur(12px) | Glass cards (`.glass`) |

### Accent colors (user-selectable, 6 options)

| Name | oklch | Hex | Personality |
|---|---|---|---|
| **Indigo** (default) | `oklch(0.6 0.22 264)` | `#6366f1` | Professional, tech |
| Violet | `oklch(0.6 0.22 290)` | `#8b5cf6` | Creative, AI |
| Emerald | `oklch(0.65 0.2 160)` | `#10b981` | Success, growth |
| Rose | `oklch(0.65 0.22 10)` | `#f43f5e` | Alert, energy |
| Amber | `oklch(0.75 0.18 75)` | `#f59e0b` | Warning, attention |
| Cyan | `oklch(0.7 0.18 210)` | `#06b6d4` | Data, precision |

### Semantic colors (fixed, never change with accent)

| Purpose | Tailwind | Notes |
|---|---|---|
| Success | `text-emerald-400` | Healthy status, positive change |
| Warning | `text-amber-400` | Degraded, needs attention |
| Danger | `text-red-400` / `text-destructive` | Error, critical |
| Info | `text-sky-400` | Neutral information |
| AI/Bot | `text-purple-400` | AI-generated content, agents |

### Status glow effects

```css
/* Healthy service dot */
box-shadow: 0 0 6px 1px rgba(52, 211, 153, 0.5);

/* Degraded service dot */
box-shadow: 0 0 6px 1px rgba(251, 191, 36, 0.5);

/* Primary accent glow (buttons, active items) */
box-shadow: 0 0 12px 2px oklch(0.6 0.22 264 / 30%);
```

---

## Typography

### Font stack

| Context | Font | Weight | Variable |
|---|---|---|---|
| Hebrew UI (default) | Rubik | 300–900 | `var(--font-rubik)` |
| Arabic UI | Cairo | 300–900 | `var(--font-cairo)` |
| English UI | System fallback | — | `system-ui` |
| Monospace (code, latency) | `font-mono` | 400–500 | Tailwind default |

### Type scale

| Role | Class | Size | Weight | Usage |
|---|---|---|---|---|
| Page title | `text-3xl font-bold tracking-tight` | 30px | 700 | H1, page headers |
| Section title | `text-base font-semibold` | 16px | 600 | Card titles |
| Card title | `text-sm font-semibold` | 14px | 600 | Widget headers |
| Body | `text-sm` | 14px | 400 | Default content |
| Caption | `text-xs` | 12px | 400 | Labels, timestamps |
| Micro | `text-[10px]` | 10px | 400–500 | Badges, metadata |

### Text color hierarchy

```
text-foreground      → primary content
text-muted-foreground → secondary, labels
text-muted-foreground/70 → tertiary, timestamps
text-muted-foreground/50 → disabled, placeholder
```

---

## Spacing System

Uses Tailwind's default 4px base unit.

| Context | Value | Usage |
|---|---|---|
| Page padding desktop | `p-6` (24px) | Main content area |
| Page padding mobile | `p-4` (16px) | Main content area |
| Card padding | `px-4 py-4` or `px-5 py-4` | Card inner |
| Section gap | `space-y-6` or `gap-6` | Between major sections |
| Component gap | `space-y-4` or `gap-4` | Within sections |
| Inline gap | `gap-2` / `gap-2.5` / `gap-3` | Icons + text |
| Border radius (cards) | `rounded-xl` (shadcn default) | Cards, panels |
| Border radius (badges) | `rounded-full` or `rounded-md` | Badges, tags |
| Border radius (buttons) | `rounded-lg` | Buttons |

---

## Elevation & Depth

Three visual layers:

```
Layer 0: Page background (--background)
Layer 1: Cards & panels (--card + border)
Layer 2: Glass cards (backdrop-blur + border/50)
Layer 3: Popovers, dropdowns, modals (elevated bg + shadow)
```

**Glass card rule**: only use `.glass` on cards that sit over the aurora background.
Cards within other cards should use plain `--card` background.

---

## Background

### Aurora Effect
Three animated radial gradient blobs (CSS, no JS):
- Blob 1: Indigo/primary — top-left, 60vw, 18s cycle
- Blob 2: Violet — top-right, 50vw, 22s cycle
- Blob 3: Cyan — bottom-center, 40vw, 16s cycle
- Opacity: `0.12` (subtle, not distracting)
- `prefers-reduced-motion`: opacity drops to `0.06`, animation disabled

**Rule**: aurora blobs MUST use the current accent color for blob 1 and 2.
When accent changes, update aurora blob colors via CSS variable.

---

## Layout

### Desktop
```
[Sidebar 256px right] | [Content area flex-1]
                         [Topbar 56px sticky]
                         [Page content scrollable]
```

### Mobile (< 768px)
```
[Full-width content]
[Topbar 56px sticky top]
[Bottom Nav 64px fixed bottom]
Sidebar → Sheet drawer from right
```

### Sidebar
- Width: `16rem` (256px) desktop, `18rem` (288px) mobile sheet
- Side: RIGHT (RTL)
- Sections: grouped with uppercase tracking-widest labels
- Active item: `bg-sidebar-accent` + left border indicator (in RTL: right border)

---

## Iconography

Library: **Lucide React** (`lucide-react`)
- Default size: `size-4` (16px) for inline, `size-3.5` for dense contexts
- Sidebar icons: `size-4`
- Stat card icons: `size-3.5`
- Empty states: `size-8` at `opacity-40`
- Never use raw `<svg>` — always use Lucide components

---

## Imagery & Illustrations

Currently: none (data-driven UI). If illustrations are added:
- Style: minimal line art, monochrome, primary color accent
- Format: SVG inline components (not img tags)
- Dark mode: use `currentColor` or CSS variables

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-04-23 | Initial design system — shell, colors, typography |
| 1.1 | 2026-04-23 | Added glassmorphism, aurora, accent color system |
| 1.2 | 2026-04-23 | Added cursor glow, card tilt 3D, page transitions, PWA rules |
