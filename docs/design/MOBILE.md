# Mobile Design Rules
> Platform UI must be fully usable on mobile browsers (iOS Safari, Android Chrome).

## Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | 1-2 columns, bottom nav, no sidebar |
| Mobile L | 640–767px | 2-3 columns, bottom nav |
| Tablet | 768–1023px | Sidebar appears, bottom nav hidden |
| Desktop | ≥ 1024px | Full layout |

## Bottom Navigation

- Fixed at bottom, `z-50`, height `64px` + safe area
- Visible ONLY on `< md` (hidden with `md:hidden`)
- 5 items max — most important destinations
- Active indicator: top border + spring animation (`layoutId="bottom-nav-indicator"`)
- Text: `text-[10px]` — very small but readable

## Bottom Nav Clearance

**CRITICAL**: Every page inside `(dashboard)` MUST have `pb-20 md:pb-0` to prevent content being hidden under the bottom nav.

```tsx
// ✅ Correct
<div className="space-y-6 pb-20 md:pb-0">

// ❌ Wrong — content hidden on mobile
<div className="space-y-6">
```

## Touch Targets

Minimum touch target: `44×44px` (Apple HIG / Google Material).
- Buttons: minimum `h-10` (40px) — use `h-11` (44px) for primary actions
- Nav items: full-width touch zone via flex
- Bottom nav items: full height of nav bar (64px)
- Icon-only buttons: `size-10` minimum on mobile

## Typography on Mobile

- Minimum readable size: `text-xs` (12px) — never smaller for content
- `text-[10px]` only for badges/metadata with short strings
- Line height: generous — `leading-relaxed` for body text blocks
- Hebrew text: Rubik renders well at all sizes on mobile

## Grid Responsive Patterns

```tsx
// Stats: 2 on mobile, 4 on desktop
className="grid grid-cols-2 lg:grid-cols-4 gap-4"

// Quick stats bar: 2 on mobile, 3 on tablet, 5 on desktop
className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"

// Feed + sidebar: stacked on mobile, side-by-side on desktop
className="grid grid-cols-1 lg:grid-cols-5 gap-6"
// Feed: lg:col-span-3 | Services: lg:col-span-2
```

## Mobile Performance Rules

- **No heavy CSS animations** on mobile — aurora blobs are CSS-only (GPU-accelerated `transform` only)
- **Card tilt 3D**: DISABLED on touch devices (`pointer: coarse`)
- **Cursor glow**: DISABLED on touch devices
- **Framer Motion**: `LazyMotion` with `domAnimation` reduces bundle by ~50%
- **Images**: always `next/image` with proper `sizes` prop
- **Fonts**: subset to `latin` + `hebrew` only (Rubik), no full unicode

## iOS Safari Specifics

- Safe area: use `env(safe-area-inset-bottom)` for bottom nav padding
- `-webkit-backdrop-filter`: always include alongside `backdrop-filter`
- Fixed elements: use `position: sticky` where possible instead of `fixed` to avoid iOS scroll bugs
- Input zoom: inputs must be `font-size: 16px` or larger to prevent auto-zoom on focus

## PWA (NEW — v1.2)

- `manifest.json`: name, icons (192×192, 512×512), `display: standalone`, `dir: rtl`, `lang: he`
- Theme color: matches `--background` dark (`#1a1a1a`)
- Offline: Next.js static pages work offline by default after first visit
- Install prompt: shown via `beforeinstallprompt` event on compatible browsers

## Sidebar on Mobile

- Sidebar uses `Sheet` component (Radix) — slides from RIGHT (RTL)
- Toggle button in topbar: `SidebarIcon` → `toggleSidebar()`
- Backdrop: clicking outside closes the sheet
- Sidebar toggle hidden on mobile topbar — bottom nav provides navigation instead
  Wait — actually toggle button IS shown on mobile for accessing full navigation
