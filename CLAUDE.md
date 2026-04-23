# Platform UI — AI Agent Instructions

> Every AI working on this project MUST read and follow these rules before writing any code.

## Project Identity

**Platform Engineer UI** — AI-powered IT platform dashboard.
- RTL-first (Hebrew default), supports Arabic + English
- Dark mode default, light mode available
- Mobile-first responsive (320px → 1920px)
- Target audience: IT admins, platform engineers, MSP operators

## Must-Read Before Coding

1. [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md) — visual language, colors, spacing, typography
2. [`docs/design/TOKENS.md`](docs/design/TOKENS.md) — CSS variables, exact values
3. [`docs/design/ANIMATIONS.md`](docs/design/ANIMATIONS.md) — motion rules + Framer Motion patterns
4. [`docs/design/COMPONENTS.md`](docs/design/COMPONENTS.md) — component patterns and anti-patterns
5. [`docs/design/MOBILE.md`](docs/design/MOBILE.md) — mobile-specific rules

## Hard Rules (never break)

- **RTL always**: `ps-`/`pe-` not `pl-`/`pr-`, `ms-`/`me-` not `ml-`/`mr-`, `start`/`end` not `left`/`right`
- **No hardcoded colors**: use CSS variables via Tailwind (`text-primary`, `bg-muted`, etc.)
- **Hydration safety**: theme-dependent rendering MUST guard with `mounted` state
- **Mobile padding**: `pb-20 md:pb-0` on page content to clear bottom nav on mobile
- **Framer Motion**: wrap with `<LazyMotion features={domAnimation}>`, `ease` typed as `[number,number,number,number]`
- **Glass cards**: `className="glass border-border/50"` — never inline backdrop-filter
- **Fonts**: Hebrew → Rubik (`var(--font-rubik)`), Arabic → Cairo (`var(--font-cairo)`)
- **No inline left/right**: use `insetInlineStart`/`insetInlineEnd` or Tailwind logical properties

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js App Router | 16.x |
| React | React | 19.x |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui (Radix) | latest |
| Animations | Framer Motion | 12.x |
| State | Zustand | 5.x |
| Charts | Recharts | 3.x |
| Forms | React Hook Form + Zod | 7.x + 4.x |
| Data Fetching | TanStack Query | 5.x |
| Tables | TanStack Table | 8.x |

## File Structure

```
app/(auth)/          — public pages (login, reset-password)
app/(dashboard)/     — protected pages with sidebar shell
components/ui/       — shadcn/ui primitives (DO NOT MODIFY)
components/shell/    — layout: sidebar, topbar, bottom-nav, aurora
components/shared/   — reusable cross-module components
lib/hooks/           — custom React hooks
lib/api.ts           — typed fetch client → Flask backend
lib/theme-store.ts   — Zustand accent color store
docs/design/         — design system (update after every design decision)
```

## When to Update Design Docs

| Trigger | File |
|---|---|
| New color / token | `TOKENS.md` |
| New animation pattern | `ANIMATIONS.md` |
| New component pattern or anti-pattern | `COMPONENTS.md` |
| Mobile behavior change | `MOBILE.md` |
| Major visual direction change | `DESIGN_SYSTEM.md` |
| New hard rule | This file |
