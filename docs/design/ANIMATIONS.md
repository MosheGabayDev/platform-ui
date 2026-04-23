# Animation System
> Motion philosophy: purposeful, snappy, never distracting.

## Core Principle

Animation communicates **state changes** and **hierarchy**.
- Page load: elements enter staggered (cascade down the importance hierarchy)
- Interaction: immediate feedback (< 200ms)
- Data updates: smooth number transitions
- Navigation: directional slides

## Standard Easing

```ts
// Primary easing — use for ALL Framer Motion transitions
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
// "ease out expo" — instant start, soft deceleration. Feels snappy and premium.

// Secondary (spring) — for UI bouncing like bottom nav indicator
{ type: "spring", stiffness: 400, damping: 30 }
```

## Variant Library

### `fadeUp` — lists, feed items, staggered content
```ts
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease },
  }),
};
// Usage: custom={index} variants={fadeUp} initial="hidden" animate="show"
```

### `scaleIn` — cards, modals, popups
```ts
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease },
  }),
};
```

### `slideInRight` — panels opening from right (RTL: from left)
```ts
const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease } },
};
```

### `slideInLeft` — panels opening from left (RTL: from right)
```ts
const slideInLeft = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { delay: 0.35, duration: 0.5, ease } },
};
```

### `pageTransition` — full page enter/exit
```ts
// Used in layout.tsx page wrappers
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};
```

## Micro-interactions

### Hover scale (interactive cards, buttons)
```tsx
<motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
```

### Press feedback (buttons, nav items)
```tsx
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
```

### Icon bounce (notification bell, status indicators)
```tsx
<motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }}>
```

## Card Tilt 3D (NEW — v1.2)

Applied to stat cards on hover. Creates depth perception.

```tsx
// components/shared/tilt-card.tsx
// Max tilt: ±8 degrees
// Perspective: 800px
// Smooth: lerp with requestAnimationFrame
// Disabled on mobile (touch devices)
```

## Cursor Glow (NEW — v1.2)

Spotlight effect following cursor over interactive cards.
- Radial gradient: `radial-gradient(300px, primary/15%, transparent)`
- Follows `mousemove` with CSS custom properties `--x` `--y`
- Only on desktop (pointer: fine)
- Does NOT affect text readability

## Count-up Animation

Numbers animate from 0 to target on page load.
```ts
// lib/hooks/use-count-up.ts
useCountUp(target: number, duration = 1200, delay = 0)
// Easing: ease out cubic (1 - (1-t)^3)
// Do not use on numbers < 10 — looks odd
```

## Page Transitions (NEW — v1.2)

Between route changes: fade + slight Y translate.
Implemented via `AnimatePresence` in root layout.

## CSS Animations (non-Framer Motion)

### Aurora blobs
```css
@keyframes aurora-1 { /* 18s, translate + scale */ }
@keyframes aurora-2 { /* 22s, translate + scale */ }
@keyframes aurora-3 { /* 16s, translate + scale */ }
```

### Page enter (CSS fallback)
```css
@keyframes page-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
main { animation: page-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
```

## Rules

- **Never** animate `width`/`height` — animate `scale` or `maxHeight` instead
- **Never** animate more than 3 properties simultaneously
- **Always** use `will-change: transform` on heavily animated elements
- **Always** respect `prefers-reduced-motion` — disable or drastically reduce all animations
- **Never** loop animations on page content — only aurora background and loading states loop
- **LazyMotion**: always wrap with `<LazyMotion features={domAnimation}>` in page components
