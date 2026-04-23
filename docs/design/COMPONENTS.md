# Component Patterns
> Approved patterns and anti-patterns. Update when new patterns are established.

## Card Variants

### Standard Card
```tsx
<Card className="border-border/50 bg-card">
```
Use for: secondary content, nested information.

### Glass Card (primary, over aurora)
```tsx
<Card className="glass border-border/50">
```
Use for: main content areas, activity feeds, charts.
Rule: `.glass` = `bg-card/60 backdrop-blur-xl border-border/8%`

### Stat Card (colored, with sparkline)
```tsx
<Card className={`relative overflow-hidden border ${border} bg-gradient-to-br ${color}`}>
  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
  {/* content + sparkline at bottom */}
</Card>
```
Use for: KPI metrics on dashboard.

### Tilt Card (interactive, desktop only)
Wraps any card with 3D perspective tilt on hover.
```tsx
import { TiltCard } from "@/components/shared/tilt-card";
<TiltCard><Card>...</Card></TiltCard>
```

## Stat Display Pattern

```tsx
<div className="text-3xl font-bold tracking-tight tabular-nums text-blue-400">
  {count.toLocaleString("he")}
</div>
<div className="flex items-center gap-1 mt-1.5">
  <TrendingUp className="size-3 text-emerald-400" />
  <span className="text-xs font-medium text-emerald-400">+12%</span>
  <span className="text-xs text-muted-foreground">משבוע שעבר</span>
</div>
```

## Status Dot Pattern

```tsx
<div className={`size-1.5 rounded-full shrink-0 ${
  status === "healthy"
    ? "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]"
    : "bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.5)] animate-pulse"
}`} />
```

## Badge Variants

```tsx
// Status: healthy
<Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
// Status: degraded
<Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
// Status: error
<Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10">
// Live indicator
<Badge variant="outline" className="gap-1.5">
  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
  בזמן אמת
</Badge>
```

## Section Header Pattern

```tsx
<div>
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
    קטגוריה משנית
  </p>
  <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/60 bg-clip-text text-transparent">
    כותרת ראשית
  </h1>
</div>
```

## Icon + Label Pattern

```tsx
// Standard inline
<div className="flex items-center gap-2.5">
  <Icon className="size-4 text-muted-foreground/60 shrink-0" />
  <span className="text-sm">{label}</span>
</div>

// With colored background
<div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
  <Icon className="size-3.5 text-primary/70" />
</div>
```

## Empty State Pattern

```tsx
<div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
  <Icon className="size-8 opacity-40" />
  <p className="text-sm">אין תוצאות</p>
  <p className="text-xs opacity-70">נסה לשנות את הסינון</p>
</div>
```

## Page Layout Pattern

```tsx
// Every page inside (dashboard) should follow:
<LazyMotion features={domAnimation}>
  <div className="space-y-6 pb-20 md:pb-0">  {/* pb-20 for bottom nav clearance */}

    {/* Page header */}
    <motion.div initial={{opacity:0, y:-16}} animate={{opacity:1, y:0}} transition={{duration:0.5, ease}}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">breadcrumb</p>
      <h1 className="text-3xl font-bold">כותרת</h1>
    </motion.div>

    {/* Content */}
    ...

  </div>
</LazyMotion>
```

## TiltCard (3D hover effect)

```tsx
import { TiltCard } from "@/components/shared/tilt-card";
// Wrap any card — auto-disabled on touch devices (pointer: coarse)
<TiltCard>
  <Card>...</Card>
</TiltCard>
// Props: maxTilt (default 8deg), className
```

## CursorGlow (spotlight effect)

```tsx
import { CursorGlow } from "@/components/shared/cursor-glow";
// Radial spotlight follows cursor — desktop only
<CursorGlow>
  <Card>...</Card>
</CursorGlow>
// Props: size (default 300px radius), className
```

## EmptyState Pattern

```tsx
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";

<EmptyState
  icon={Users}
  title="אין משתמשים"
  description="הוסף משתמש ראשון לארגון"
  action={{ label: "הוסף משתמש", onClick: () => router.push("/users/new") }}
  size="md"  // "sm" | "md" | "lg"
/>
```

## Skeleton Loading States

```tsx
import {
  StatCardSkeleton,
  FeedItemSkeleton,
  ServiceRowSkeleton,
  TableSkeleton,
} from "@/components/shared/skeleton-card";

// Show during isLoading — matches exact shape of real content
{isLoading
  ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} index={i} />)
  : <RealContent />
}
```

## DataTable Pattern

```tsx
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";

const columns: Column<User>[] = [
  { key: "name", label: "שם", sortable: true },
  { key: "email", label: "אימייל", sortable: true },
  { key: "role", label: "תפקיד", render: (v) => <Badge>{String(v)}</Badge> },
];

<DataTable
  data={users}
  columns={columns}
  pageSize={10}
  searchable
  searchKeys={["name", "email"]}
  emptyState={<EmptyState icon={Users} title="אין משתמשים" />}
/>
```

## ConnectionIndicator

```tsx
// Already in Topbar — shows real-time latency dot
// green = connected, amber = reconnecting, red = disconnected
// Uses window online/offline events + simulated latency drift
import { ConnectionIndicator } from "@/components/shell/connection-indicator";
```

## SidebarSearch

```tsx
// Already in AppSidebar — do not duplicate
// Shortcut: press "/" anywhere to focus
// Keyboard: ↑↓ navigate, ↵ go, Esc close
// Highlights matching characters, shows group label
```

## Anti-Patterns (NEVER DO)

| ❌ Don't | ✅ Do instead |
|---|---|
| `pl-4` / `pr-4` | `ps-4` / `pe-4` |
| `ml-auto` / `mr-auto` | `ms-auto` / `me-auto` |
| `left-0` / `right-0` (non-physical) | `start-0` / `end-0` |
| Hardcoded `#6366f1` | `text-primary` / `bg-primary` |
| `style={{ backdropFilter: "blur(12px)" }}` | `className="glass"` |
| `text-white` | `text-foreground` or `text-primary-foreground` |
| `bg-gray-900` | `bg-background` or `bg-card` |
| `<img src=...>` for icons | Lucide React components |
| Long animation (> 0.6s) on content | Max 0.5s for content |
| Animation without `prefers-reduced-motion` fallback | Always add `@media (prefers-reduced-motion)` |
| `useTheme()` result used directly in JSX | Guard with `mounted` state |
| Modifying files in `components/ui/` | Use `components/shared/` for custom variants |
| Raw `fetch` in components | `useQuery` + `lib/api/client.ts` |
| Inline query strings in `queryKey` | Define in `lib/api/query-keys.ts` |
| Direct Flask URL from client | `/api/proxy/*` Next.js proxy |
| Calling Flask without cookie forwarding | Proxy handles it automatically |
| Missing skeleton on data load | Always show Skeleton during `isLoading` |
| Page without `pb-20 md:pb-0` | Required for bottom nav clearance |
