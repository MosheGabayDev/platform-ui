# 25 — Open-Source Capability Layer

_Format: Library evaluation + integration standards_
_Last updated: 2026-04-24_
_Round: 011 (created), 012 (foundation implemented)_

---

## Purpose

This document standardizes the open-source libraries that provide **horizontal capabilities** across all 19 platform modules: data grids, dashboard layout, forms, file import/export, permission-aware UI actions, multi-tenant safety, and audit mutations. Every module build must conform to the patterns documented here — do not evaluate these library choices per module.

---

## 1. Capability Map

| Capability | Library Chosen | Already Installed? | Priority |
|---|---|---|---|
| Data Grid (tables) | `@tanstack/react-table` v8 | ✅ Yes (`^8.21.3`) | P0 |
| Charts / Widgets | `recharts` v3 | ✅ Yes (`^3.8.1`) | P0 |
| Form state | `react-hook-form` v7 + `zod` v4 | ✅ Yes | P0 |
| URL filter state | `nuqs` | ❌ Pending install | P1 |
| Date picker | `react-day-picker` v8 | ❌ Pending install | P1 |
| CSV/Excel export | `papaparse` + `xlsx` (opt-in) | ❌ Pending install | P2 |
| CSV import preview | `papaparse` | ❌ Pending install | P2 |
| Dashboard drag-resize | `react-grid-layout` | ❌ Pending install | P3 |
| Virtual scroll | `@tanstack/react-virtual` | ❌ Pending install | P2 |
| Permission-aware actions | Internal pattern (see §6) | ✅ Implemented (Round 012) | P0 |
| Audit mutations | Internal pattern (see §8) | ✅ Proxy headers implemented (Round 012) | P0 |

---

## 2. Data Grid — Standard Pattern

**Library:** `@tanstack/react-table` v8 (headless, already installed)

**Why not AG Grid / react-data-grid:**
- AG Grid Community is free but has opaque internal state that conflicts with TanStack Query's cache ownership
- `@tanstack/react-table` is already installed and used in Users module — consistency over feature completeness
- RTL: TanStack Table is direction-agnostic (we control the render); AG Grid RTL mode requires enterprise license

### Canonical DataTable Pattern

All module list pages must use `DataTable<T>` from `components/shared/data-table` (implemented Round 012). The Users module `UsersTable` is the reference implementation and has been refactored to use it.

**Required props pattern:**

```typescript
interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  // Optional
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}
```

**Mandatory behaviors:**
1. `manualPagination: true` — all pagination is server-side
2. Skeleton rows during loading (never spinner overlay — avoid layout shift)
3. RTL pagination: ChevronRight = previous, ChevronLeft = next (logical direction flip)
4. Empty state component when `data.length === 0 && !isLoading`
5. Error state with retry when query is in error state

**Column definition conventions:**

```typescript
// Sort indicator: show only on sorted column
// Align: numbers right (start in RTL), text uses default
// Max width: 300px for text columns, 120px for status/date columns
const columns: ColumnDef<UserSummary>[] = [
  { accessorKey: "name", header: "שם", size: 200 },
  { accessorKey: "email", header: "אימייל", size: 250 },
  { accessorKey: "role", header: "תפקיד", size: 120, cell: ({ row }) => <RoleBadge ... /> },
];
```

### Virtual Scroll (large datasets)

For tables with >500 rows rendered at once (audit logs, call history), add `@tanstack/react-virtual`:

```bash
npm install @tanstack/react-virtual
```

Use `useVirtualizer` from `@tanstack/react-virtual` with `overscan: 5`. Only apply to modules where row count exceeds 200 in typical org usage.

---

## 3. Charts and Dashboard Widgets

**Library:** `recharts` v3 (already installed)

**Why recharts over Chart.js / Nivo:**
- React-native (no imperative Canvas API) — SSR-safe
- Already installed; consistent with existing dashboard stats
- RTL: `recharts` respects `dir="rtl"` for axis/label mirroring automatically

### Standard Widget Wrapper

All dashboard stat cards and chart widgets must be wrapped in `<StatCard>` / `<ChartCard>` components (to be created at `components/ui/stat-card.tsx`, `components/ui/chart-card.tsx`). These handle:
- Skeleton state (`isLoading`)
- Error state
- Consistent padding / border / heading
- `aria-label` for accessibility

**Approved chart types per use case:**

| Use Case | Chart Type | Component |
|---|---|---|
| Trend over time | `<LineChart>` | `recharts/LineChart` |
| Categorical count | `<BarChart>` | `recharts/BarChart` |
| Ratio / proportion | `<PieChart>` | `recharts/PieChart` |
| Progress to quota | `<RadialBarChart>` | `recharts/RadialBarChart` |
| Single metric | `<StatCard>` | Custom (no chart lib) |

**Color system:** Use Tailwind CSS custom properties (`--color-primary`, `--color-muted`) for chart colors — never hardcode hex values. This ensures dark mode compatibility.

---

## 4. Forms

**Libraries:** `react-hook-form` v7 + `zod` v4 (both already installed)

**Why this stack:**
- `react-hook-form`: uncontrolled inputs, minimal re-renders, native RTL
- `zod`: schema-first validation; types derived from schema (no duplication)
- `@hookform/resolvers`: bridges them (already installed)

### Canonical Form Pattern

```typescript
// 1. Define schema (source of truth for type + validation)
const createUserSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  role: z.enum(["admin", "manager", "technician", "viewer"]),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

// 2. Form component
function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "technician" },
  });
  const mutation = useMutation({ mutationFn: createUser, onSuccess });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(mutation.mutate)}>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>אימייל</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {/* ... */}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "שומר..." : "צור משתמש"}
        </Button>
      </form>
    </Form>
  );
}
```

**Mandatory rules:**
1. Schema lives in `lib/modules/<module>/schemas.ts` — not inline in the component
2. Every required field has a Hebrew error message in the schema
3. Submit button shows loading state during mutation (`isPending`)
4. Form errors reset on successful submit
5. `FormField` wraps every input (not bare `<input>`) — ensures consistent error display

### URL Filter State (Search/Filter Forms)

Install `nuqs` for filter/pagination state in list pages:

```bash
npm install nuqs
```

Pattern:
```typescript
// Replaces manual useSearchParams + router.push
import { useQueryState } from "nuqs";

const [search, setSearch] = useQueryState("q", { defaultValue: "" });
const [page, setPage] = useQueryState("page", { defaultValue: 1, parse: parseInt });
const [role, setRole] = useQueryState("role", { defaultValue: "" });
```

`nuqs` must be used for all list page filters. Direct `useSearchParams` + `router.push` is banned in module list pages after nuqs is installed — filter state must survive navigation and browser back/forward.

---

## 5. File Import / Export

### CSV Export

**Library:** `papaparse` (CSV unparse)

```bash
npm install papaparse
npm install @types/papaparse --save-dev
```

Pattern:
```typescript
import Papa from "papaparse";

function exportToCsv<T extends object>(data: T[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  // \uFEFF = BOM for Excel Hebrew RTL compatibility
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

**BOM is mandatory** — Excel on Windows misreads Hebrew UTF-8 without BOM.

### Excel Export

**Library:** `xlsx` (SheetJS Community Edition) — install only in modules that explicitly need Excel output (helpdesk reports, billing summaries). Not a global dependency.

```bash
npm install xlsx
```

Keep `xlsx` as a dynamic import to avoid it in the main bundle:
```typescript
const exportToExcel = async (data: Row[], filename: string) => {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
```

### CSV Import Preview

**Library:** `papaparse` (CSV parse with streaming)

```typescript
function handleCsvUpload(file: File, onRows: (rows: Record<string, string>[]) => void) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => onRows(results.data as Record<string, string>[]),
    error: (error) => console.error("CSV parse error:", error),
  });
}
```

Import preview pattern (standard across all modules with import):
1. File drag-drop or `<input type="file">` — max 10MB client-side check
2. `papaparse` parses preview (first 10 rows shown)
3. Column mapping UI (if headers don't match expected schema)
4. Zod schema validates each row before POST
5. Error rows listed with row numbers — not silently dropped

---

## 6. Permission-Aware UI Actions

This is an internal pattern, not a library. All action buttons (edit, delete, approve, escalate) must be permission-gated.

### `usePermission` Hook

Create at `lib/auth/use-permission.ts`:

```typescript
import { useSession } from "next-auth/react";
import { hasRole, hasPermission } from "@/lib/auth/rbac";

export function usePermission() {
  const { data: session } = useSession();
  return {
    can: (permission: string) => hasPermission(session, permission),
    isRole: (...roles: string[]) => hasRole(session, ...roles),
    isAdmin: () => session?.user?.is_admin ?? false,
    isSystemAdmin: () => session?.user?.is_system_admin ?? false,
  };
}
```

### Permission Gate Component

Create at `components/auth/permission-gate.tsx`:

```typescript
interface PermissionGateProps {
  permission?: string;
  role?: string | string[];
  adminOnly?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  role,
  adminOnly,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, isRole, isAdmin } = usePermission();
  
  const allowed =
    (permission ? can(permission) : true) &&
    (role ? isRole(...(Array.isArray(role) ? role : [role])) : true) &&
    (adminOnly ? isAdmin() : true);
  
  return allowed ? <>{children}</> : <>{fallback}</>;
}
```

Usage:
```tsx
<PermissionGate adminOnly>
  <Button onClick={handleDelete} variant="destructive">מחק</Button>
</PermissionGate>

<PermissionGate role={["admin", "manager"]} fallback={<span className="text-muted-foreground">אין הרשאה</span>}>
  <ApproveButton id={userId} />
</PermissionGate>
```

**Rules:**
1. Every destructive action (delete, archive, revoke) must be inside `<PermissionGate adminOnly>` or `<PermissionGate role="admin">`
2. Hidden ≠ disabled — backend must also enforce; the UI gate is for UX only
3. Never derive permissions from `session.user.role` string comparison inline — always use `usePermission()` hook
4. Admin-only actions that are hidden should NOT render a disabled button — they should render nothing (or a locked icon with tooltip)

---

## 7. Multi-Tenant Safety Rules

These rules apply to every component and hook in every module. They are not optional.

### Rule T-1: Org ID from auth, never from props or URL

```typescript
// WRONG — org_id from URL param is a tenant leakage vector
const orgId = params.org_id;

// CORRECT — org_id always from session
const { data: session } = useSession();
const orgId = session?.user?.org_id;
```

The backend enforces `org_id` scoping via `g.jwt_user.org_id` (see ADR-015). The frontend must not pass `org_id` in request bodies. If an API requires it for a shared admin view, it must come from session.

### Rule T-2: System-admin cross-tenant views are explicit

When building views that system admins use to view other orgs' data (e.g., support console), the component must:
1. Check `session?.user?.is_system_admin === true` before rendering
2. Display a visible org context indicator ("מציג נתוני: Acme Corp")
3. Use a separate query key namespace: `["admin", "org", targetOrgId, ...]`

### Rule T-3: Optimistic updates must scope cache invalidation

```typescript
const mutation = useMutation({
  mutationFn: approveUser,
  onSuccess: () => {
    // WRONG — invalidates all users queries including other orgs in system-admin view
    queryClient.invalidateQueries({ queryKey: ["users"] });
    
    // CORRECT — scope to current session's org
    queryClient.invalidateQueries({ queryKey: queryKeys.users.list({ orgId }) });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
  },
});
```

### Rule T-4: No cross-tenant data in local state

Zustand stores must never hold data from multiple orgs simultaneously. If the user is a system admin switching between orgs, the Zustand org-scoped state must be cleared on org switch.

---

## 8. Audit Mutations

All write operations (create, update, delete, approve, revoke) in platform-ui must use the `useAuditedMutation` pattern. The backend records the audit event; the frontend's role is to ensure the correct context is attached.

### Standard Mutation Pattern

All module mutations follow this structure:

```typescript
// lib/modules/<module>/mutations.ts
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      toast.success(`המשתמש ${data.data.user.name} נוצר בהצלחה`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message ?? "שגיאה ביצירת משתמש");
    },
    meta: {
      // Passed to TanStack Query devtools and error reporting
      action: "users.create",
      actorId: session?.user?.id,
    },
  });
}
```

**Rules:**
1. Every mutation lives in `lib/modules/<module>/mutations.ts` — not inline in components
2. Success toast must name the affected entity (not just "נשמר בהצלחה")
3. Error toast must show backend error message if available
4. After any mutation, invalidate the relevant list query AND the detail query (if it exists)
5. Optimistic updates are allowed only for low-risk toggle operations (active/inactive); complex mutations use server-confirmed updates

### Audit Context Header

The proxy route at `app/api/proxy/[...path]/route.ts` must attach:

```typescript
headers: {
  "Authorization": `Bearer ${token}`,
  "X-User-Id": session.user.id.toString(),
  "X-Org-Id": session.user.org_id.toString(),
  "X-Action-Source": "platform-ui",
}
```

The Flask backend uses `X-Action-Source` in `UserActivity` records to distinguish platform-ui actions from mobile app and API token actions.

---

## 9. Dashboard Layout

**Decision: Defer `react-grid-layout` to Phase 3.**

Reasoning: No dashboard builder feature is planned in Phase 2 modules. The current dashboard uses a fixed grid with `recharts` widgets — sufficient for now.

When a configurable dashboard builder is needed (Phase 3, likely for the Monitoring module):

**Library to add:** `react-grid-layout`

```bash
npm install react-grid-layout
npm install @types/react-grid-layout --save-dev
```

RTL support: `react-grid-layout` uses absolute `left` positioning by default. RTL adaptation requires using `right` offsets; a wrapper `<RtlGridLayout>` component will be needed to mirror x-coordinates: `mirroredX = (gridCols - layout.x - layout.w)`.

Do not add `react-grid-layout` until the Monitoring module dashboard builder sprint. Track as Phase 3 task.

---

## 10. Date / Time

**Library to add:** `react-day-picker` v8 (used by shadcn/ui Calendar component)

```bash
# Already transitively available via shadcn/ui — add Calendar component:
npx shadcn@latest add calendar
npx shadcn@latest add date-picker
```

**Rules:**
1. All dates stored and sent to backend as ISO 8601 UTC strings
2. All dates displayed in `he-IL` locale using `Intl.DateTimeFormat`
3. Relative times ("לפני 3 שעות") use `Intl.RelativeTimeFormat` — not `moment.js` or `date-fns`
4. Never display raw UTC timestamps — always localize before render

```typescript
// Utility: lib/utils/date.ts
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("he", { numeric: "auto" });
  if (diff < 60) return rtf.format(-Math.round(diff), "second");
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  return rtf.format(-Math.round(diff / 86400), "day");
}
```

---

## 11. Toast Notifications

**Library:** `sonner` (already installed `^2.0.7`)

**Standard usage:**

```typescript
import { toast } from "sonner";

// Success
toast.success("המשתמש נוצר בהצלחה");

// Error
toast.error("שגיאה בשמירה — נסה שוב");

// Info with action
toast.info("הייבוא הושלם", {
  action: { label: "צפה בתוצאות", onClick: () => router.push("/users") },
});
```

**Rules:**
1. Never use `alert()` or `window.confirm()` — always `toast` or `Dialog`
2. Destructive confirmations (delete, revoke) must use a `Dialog` with explicit confirm button — not just a toast
3. Background operations (export, import) use `toast.promise()` with loading/success/error states

---

## 12. Loading and Skeleton States

**Pattern:** Skeleton-first (not spinner-first)

All data-bearing components must show skeleton content during loading, matching the layout of the loaded content. Avoid layout shifts between skeleton and data.

**Never use:**
- Full-page spinner overlays on list pages
- `null` return during loading (causes layout shift)
- "טוען..." text alone (not accessible)

**Shared skeletons to create:**

| Component | Path | Used By |
|---|---|---|
| `TableRowSkeleton` | `components/ui/table-row-skeleton.tsx` | All list pages |
| `StatCardSkeleton` | `components/ui/stat-card-skeleton.tsx` | Dashboard, stats headers |
| `DetailSkeleton` | `components/ui/detail-skeleton.tsx` | Detail pages |

---

## 13. Empty States

Every list page must have a distinct `EmptyState` component. Empty ≠ loading ≠ error — each has a different illustration/message.

**Pattern:**

```typescript
// components/ui/empty-state.tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

**Message conventions (Hebrew):**
- Empty list: "לא נמצאו [items]"
- No search results: "לא נמצאו תוצאות עבור '[query]'"
- Error: "שגיאה בטעינת הנתונים" + retry button

---

## 14. RTL Conventions (Cross-Module)

All components must follow RTL-first conventions. This section is the definitive reference.

**Tailwind logical properties (mandatory):**

| Do NOT use | Use Instead |
|---|---|
| `ml-*`, `mr-*` | `ms-*` (margin-inline-start), `me-*` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `left-*`, `right-*` (layout) | `start-*`, `end-*` |
| `border-l-*`, `border-r-*` | `border-s-*`, `border-e-*` |
| `rounded-l-*`, `rounded-r-*` | `rounded-s-*`, `rounded-e-*` |

**Icon direction flips:** Icons that represent direction (chevrons, arrows) must flip in RTL. Use CSS `rtl:scale-x-[-1]` or conditionally swap the icon.

**Pagination direction:**
```tsx
// In RTL layout: visual "previous" is on the right, "next" is on the left
<Button onClick={onPrevPage}><ChevronRight className="h-4 w-4" /></Button>
<Button onClick={onNextPage}><ChevronLeft className="h-4 w-4" /></Button>
```

---

## 15. Component File Size Gates

Per ADR-013:
- TypeScript component files: ≤ 150 lines
- TypeScript page files: ≤ 200 lines (higher limit due to query + render)
- If a component exceeds the limit, extract sub-components before merging

Shared components live in `components/ui/` (design system primitives) or `components/modules/<module>/` (module-specific).

---

## 16. Installation Order

When starting a new module build, install missing libraries in this sequence:

```bash
# Phase 1 — install before first module build
npm install nuqs

# Phase 2 — install when first import/export feature is built
npm install papaparse
npm install @types/papaparse --save-dev

# Phase 2 — install when first large table (>500 rows) is needed
npm install @tanstack/react-virtual

# Phase 2 — install when first date picker is needed
# (shadcn/ui Calendar already uses react-day-picker transitively)
npx shadcn@latest add calendar date-picker

# Phase 3 — install only for Monitoring dashboard builder
npm install react-grid-layout
npm install @types/react-grid-layout --save-dev

# Phase 3 — install only for modules needing Excel export (helpdesk, billing)
npm install xlsx
```

Do not install all at once — each library adds bundle weight. Install on first use.

---

## 17. What NOT to Add

| Library | Why Rejected |
|---|---|
| `moment.js` | 67KB gzipped; deprecated; `Intl.*` covers all use cases |
| `date-fns` | Smaller than moment but still unnecessary — `Intl.*` preferred |
| `lodash` | Tree-shaking issues; use native JS or targeted `lodash-es` imports only |
| `axios` | `fetch` with Next.js handles our needs; axios adds ~14KB |
| `react-query-devtools` (prod) | Dev-only; ensure it never ships to production bundle |
| `AG Grid Enterprise` | License cost + vendor lock-in |
| `Material UI` / `Ant Design` | Conflicts with shadcn/ui design system; heavy bundle |
| `Chart.js` | Recharts already installed; two chart libraries create confusion |
| `react-beautiful-dnd` | Unmaintained; use `@dnd-kit/core` if drag-drop is needed |

---

## 18. ADR-016 Reference

See `../08-decisions/decision-log.md §ADR-016` for the formal architecture decision record covering this capability layer.

---

## Revision History

| Date | Round | Change |
|---|---|---|
| 2026-04-24 | 011 | Document created — establishes all horizontal capability standards |
