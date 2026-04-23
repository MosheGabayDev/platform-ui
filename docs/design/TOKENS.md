# Design Tokens
> Single source of truth for all design values.

## CSS Custom Properties (set in globals.css)

### Overrides in `.dark` class
```css
--primary:              oklch(0.6 0.22 264);   /* indigo default — user-overridable */
--primary-foreground:   oklch(0.98 0 0);
--ring:                 oklch(0.6 0.22 264);
--sidebar-primary:      oklch(0.6 0.22 264);
--sidebar-primary-foreground: oklch(0.98 0 0);
```

### Runtime-overridable (via accent picker → JS)
```js
document.documentElement.style.setProperty("--primary", color.oklch);
document.documentElement.style.setProperty("--ring", color.oklch);
document.documentElement.style.setProperty("--sidebar-primary", color.oklch);
```

## Tailwind Utility Tokens

### Spacing shortcuts used in this project
| Token | Value | Usage |
|---|---|---|
| `p-4` | 16px | Mobile page padding |
| `p-6` | 24px | Desktop page padding |
| `gap-4` | 16px | Grid/flex gap standard |
| `gap-6` | 24px | Section gap |
| `gap-2.5` | 10px | Icon + label |
| `h-14` | 56px | Topbar height |
| `h-16` | 64px | Bottom nav height |
| `size-4` | 16px | Standard icon |
| `size-8` | 32px | Large icon / avatar |

## Animation Timing Tokens

```ts
// In every file that uses Framer Motion
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
// This is "ease out expo" — snappy start, soft landing

const DURATION_FAST   = 0.2;   // hover states, micro-interactions
const DURATION_BASE   = 0.35;  // standard transitions
const DURATION_SLOW   = 0.5;   // page elements, large components
const STAGGER_ITEM    = 0.07;  // delay between list items
const STAGGER_CARD    = 0.06;  // delay between cards
```

## Z-Index Scale

| Layer | Value | Usage |
|---|---|---|
| Aurora background | `z-0` | Fixed background blobs |
| Page content | `z-10` | Normal content flow |
| Sidebar | `z-20` | Sidebar panel |
| Topbar | `z-40` | Sticky header |
| Bottom nav | `z-50` | Fixed bottom bar |
| Modals/dialogs | `z-50` | Radix portals |
| Tooltips | `z-50` | Radix portals |

## Breakpoints (Tailwind default)

| Name | Min-width | Context |
|---|---|---|
| `sm` | 640px | Large phones landscape |
| `md` | 768px | Tablets — sidebar appears, bottom nav hidden |
| `lg` | 1024px | Laptop — full grid layouts |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

## Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | 4px | Small badges |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Buttons standard |
| `rounded-xl` | 12px | Cards (shadcn default) |
| `rounded-2xl` | 16px | Large panels |
| `rounded-full` | 9999px | Pills, avatars, dots |

## Opacity Scale

| Usage | Value |
|---|---|
| Disabled state | `opacity-40` |
| Muted icons | `opacity-60` / `/60` |
| Subtle dividers | `border-border/40` |
| Glass bg | `/60` on card color |
| Aurora blobs | `0.12` (CSS) |
| Aurora reduced-motion | `0.06` (CSS) |
