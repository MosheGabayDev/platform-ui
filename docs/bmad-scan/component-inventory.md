# Component Inventory — platform-ui

**Generated:** 2026-05-01 (BMAD Deep Scan).

## components/ui/ (shadcn/ui primitives — READ-ONLY)

These come from shadcn CLI and must not be modified directly. Use them as-is or wrap them in `components/shared/`.

Includes (typical shadcn set, exact list per repo): button, input, dialog, sheet, select, dropdown-menu, table, badge, separator, skeleton, tabs, command, popover, tooltip, label, textarea, switch, checkbox, radio-group, calendar, scroll-area, sonner toaster, …

---

## components/shared/ (cross-module reusable)

| Component | File | Purpose | Status |
|---|---|---|---|
| ActionButton | `action-button.tsx` | Mutation trigger with loading/disabled/aria-busy | ✅ R041B |
| ConfirmActionDialog | `confirm-action-dialog.tsx` | Dangerous-action confirmation (replaces window.confirm) | ✅ |
| DataTable | `data-table/` | TanStack Table wrapper with sort/filter/paginate | ✅ R012 |
| DetailView | `detail-view/` | Entity detail layout (InfoRow, BoolBadge, …) | 🟡 partial — extraction pending |
| EmptyState | `empty-state.tsx` | Animated icon + title + description + action | ✅ |
| ErrorBoundary | `error-boundary.tsx` | Catches render errors per page | ✅ R015 |
| ErrorState | `error-state.tsx` | Error display badge | ✅ |
| FeatureGate + useFeatureFlag | `feature-gate.tsx` + `lib/hooks/use-feature-flag.ts` | Plan-gated module surfaces, fail-closed | ✅ R041D-UI |
| PlatformForm | `form/` | RHF + Zod wrapper with FormError + FormActions | ✅ R017–R019 |
| PageShell | `page-shell/` | Consistent module page layout | ✅ R015 |
| PermissionGate + usePermission | `permission-gate.tsx` | RBAC visibility gating | ✅ R012 |
| SkeletonCard set | `skeleton-card.tsx` | StatCardSkeleton, FeedItemSkeleton, ServiceRowSkeleton, TableSkeleton | ✅ |
| KpiCard + StatCard | `stats/` | Rich + compact KPI tiles with count-up + trend + sparkline | ✅ R041G |
| Timeline | `timeline/` | Activity history (events, skeleton, types) | ✅ R041E |
| TiltCard | `tilt-card.tsx` | 3D perspective tilt on hover (touch-disabled) | ✅ |
| CursorGlow | `cursor-glow.tsx` | Radial spotlight following cursor (desktop only) | ✅ |

---

## components/shell/ (layout chrome — never module-specific)

| Component | File | Purpose |
|---|---|---|
| AppSidebar | `app-sidebar.tsx` | RTL right-side sidebar: search, pinned, recent, collapsible groups |
| Topbar | `topbar.tsx` | Sticky header: search, theme, accent picker, notifications, connection indicator |
| BottomNav | `bottom-nav.tsx` | Mobile-only bottom nav (md:hidden) with spring layoutId indicator |
| AuroraBackground | `aurora-background.tsx` | CSS animated blobs (decorative bg) |
| CommandPalette | `command-palette.tsx` | Ctrl+K / ⌘K global palette over Cmdk |
| ConnectionIndicator | `connection-indicator.tsx` | Real-time backend latency dot |
| SidebarSearch | `sidebar-search.tsx` | Inline `/` search with ↑↓↵ keyboard nav |
| ShortcutsDialog | `shortcuts-dialog.tsx` | `?` cheat-sheet |
| AccentPicker | `accent-picker.tsx` | 6 accent colors via CSS variable |
| NotificationBell | `notification-bell.tsx` | Badge count + drawer trigger |
| NotificationDrawer | `notification-drawer.tsx` | Notifications list with empty state |
| NavItems | `nav-items.ts` | ⚠ Currently hardcoded — to be replaced by Navigation API (R044) |

---

## components/modules/<key>/ (module-specific, not shared)

| Module | Components |
|---|---|
| users | UserCreateSheet (in `user-form.tsx`), user-form (with FormSection variant) |
| organizations | OrgCreateSheet, org-form |
| roles | RoleCreateSheet, role-form |

These promote to `components/shared/` only when they appear in 2+ modules (master-roadmap §11 anti-overengineering rule).

---

## components/providers/

| Provider | Purpose |
|---|---|
| QueryProvider | TanStack QueryClient with sane defaults (staleTime, refetchOnFocus) |
| SessionProvider | Wraps next-auth `<SessionProvider>` for client components |

---

## Capability completion status (relative to master-roadmap §6 Pre-Launch Gates)

| Capability | Status |
|---|---|
| 01 PlatformDataGrid | ✅ |
| 02 PlatformDashboard / KpiCard | ✅ R041G |
| 03 PlatformForm | ✅ |
| 04 PlatformAction / ActionButton | ✅ R041B |
| 05 PermissionGate | ✅ |
| 06 PlatformImportExport | 🟡 csv export only |
| 07 PlatformPageShell | ✅ |
| 08 PlatformDetailView | 🟡 inline pattern, extraction pending |
| 09 PlatformTimeline | ✅ R041E |
| 12 PlatformNotifications | ✅ R042 |
| 17 PlatformFeatureFlags | ✅ R041D-UI |
| 19 PlatformTenantContext | ✅ |
| 21 PlatformErrorBoundary | ✅ |
| 22 PlatformAPI Client | ✅ |
| 10 PlatformAuditLog | 🔴 not started |
| 11 PlatformSearch (cmd+K) | 🟡 nav only, no API search |
| 13 PlatformApprovalFlow | 🔴 not started |
| 14 PlatformJobRunner | 🔴 not started |
| 15 PlatformWizard | 🔴 not started |
| 16 PlatformSettings Engine | 🔴 not started |
| 18 PlatformModuleRegistry | 🟡 manifests exist, loader pending |
| 20 PlatformPrivacy / PII | 🔴 not started |
| 23 PlatformRealtime (SSE) | 🔴 not started |
| 24 PlatformFileManager | 🔴 not started |
| 25 PlatformIntegration | 🔴 not started |
| 26 PlatformBilling Meter | 🔴 not started |
| 27 PlatformPolicy Engine | 🔴 not started |
| 28 PlatformHelp / Tours | 🔴 not started |
| 29 PlatformTest Harness | 🔴 not started |
| 30 PlatformDeveloper Docs | 🔴 not started |

Capability catalog full text: `docs/system-upgrade/04-capabilities/catalog.md`.
