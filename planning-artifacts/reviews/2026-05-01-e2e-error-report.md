# E2E Browser Error Report — 2026-05-01

Source: `test-results/error-capture/` (8 test files)
Total errors captured: **84**

## Triage summary

| Severity | Group | Count | Owner | Tracked |
|----------|-------|------:|-------|---------|
| **HIGH (real bug)** | `Cannot read properties of undefined (reading 'subscribe')` page-error on Ctrl+K | 1 | shell | [Q29](../../docs/system-upgrade/08-decisions/open-questions.md) |
| **HIGH (a11y)** | `DialogContent requires a DialogTitle` (CommandDialog primitive tree) | 2+ | shell | [Q29](../../docs/system-upgrade/08-decisions/open-questions.md) |
| **MEDIUM (UX)** | Recharts `width(-1) height(-1)` × 10 — 0×0 sparkline container | 10 | dashboard | [Q30](../../docs/system-upgrade/08-decisions/open-questions.md) |
| **LOW (expected, document)** | `/api/proxy/*` 401/404 noise — backend not live in mock-mode demos | ~70 | tooling | [Q31](../../docs/system-upgrade/08-decisions/open-questions.md) |

The HIGH findings are real defects regardless of backend state. The LOW group is expected for offline mock-mode runs and is the dominant noise source — Q31 must be answered before this report is useful for regression hunting.



## By kind

| Kind | Count |
|------|------:|
| `console-error` | 35 |
| `http-error` | 33 |
| `console-warning` | 12 |
| `request-failed` | 3 |
| `page-error` | 1 |

## By route

| Route | Errors |
|-------|------:|
| http://localhost:3001/ | 55 |
| http://localhost:3001/organizations | 9 |
| http://localhost:3001/helpdesk | 6 |
| http://localhost:3001/users | 6 |
| http://localhost:3001/roles | 4 |
| http://localhost:3001/helpdesk/tickets | 2 |
| http://localhost:3001/helpdesk/tickets/1001 | 2 |

## Top issues (grouped by message)

### 1. `console-error` × 20

```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Command_palette_opens_via_Ctrl_K, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Shell_theme_sidebar_render_on_dashboard

### 2. `http-error` × 13

```
GET http://localhost:3001/api/proxy/notifications
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Command_palette_opens_via_Ctrl_K, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Helpdesk_dashboard_KPI_tiles_render, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Helpdesk_tickets_list_filters_sort_visible, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Helpdesk_ticket_detail_timeline_renders (+3 more)

**URL:** `http://localhost:3001/api/proxy/notifications`
**Status:** 404

### 3. `console-error` × 13

```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Command_palette_opens_via_Ctrl_K, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Helpdesk_dashboard_KPI_tiles_render, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Helpdesk_tickets_list_filters_sort_visible, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Helpdesk_ticket_detail_timeline_renders (+3 more)

### 4. `console-warning` × 10

```
The width(-1) and height(-1) of chart should be greater than 0,
       please check the style of container, or the props width(100%) and height(100%),
       or add a minWidth(0) or minHeight(undefine…
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply

### 5. `http-error` × 5

```
GET http://localhost:3001/api/proxy/monitoring/health
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Command_palette_opens_via_Ctrl_K, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Shell_theme_sidebar_render_on_dashboard

**URL:** `http://localhost:3001/api/proxy/monitoring/health`
**Status:** 401

### 6. `http-error` × 5

```
GET http://localhost:3001/api/proxy/ai-settings/stats
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Command_palette_opens_via_Ctrl_K, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Shell_theme_sidebar_render_on_dashboard

**URL:** `http://localhost:3001/api/proxy/ai-settings/stats`
**Status:** 401

### 7. `http-error` × 5

```
GET http://localhost:3001/api/proxy/ai-settings/stats/timeseries?days=30
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Command_palette_opens_via_Ctrl_K, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page, smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Shell_theme_sidebar_render_on_dashboard

**URL:** `http://localhost:3001/api/proxy/ai-settings/stats/timeseries?days=30`
**Status:** 401

### 8. `request-failed` × 3

```
net
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page

**URL:** `http://localhost:3001/api/proxy/notifications`

### 9. `console-error` × 2

```
`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.

If you want to hide the `DialogTitle`, you can wrap it with our VisuallyHidden component.

For mor…
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply

### 10. `console-warning` × 2

```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__AI_shell_open_drawer_send_message_see_mock_reply

### 11. `page-error` × 1

```
Cannot read properties of undefined (reading 'subscribe')
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Command_palette_opens_via_Ctrl_K

<details><summary>Sample stack</summary>

```
TypeError: Cannot read properties of undefined (reading 'subscribe')
    at P (http://localhost:3001/_next/static/chunks/04_3_05hchkb._.js:17466:251)
    at http://localhost:3001/_next/static/chunks/04_3_05hchkb._.js:17330:76
    at Object.react_stack_bottom_frame (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:15037:24)
    at renderWithHooks (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:4620:24)
    at updateForwardRef (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:5908:21)
    at beginWork (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:6766:24)
    at runWithFiberInDEV (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:965:74)
    at performUnitOfWork (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:9555:97)
    at workLoopSync (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:9449:40)
    at renderRootSync (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:9433:13)
    at performWorkOnRoot (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:9098:47)
    at performSyncWorkOnRoot (http://localhost:3001/_next/static/chunks/04_3_next_dist_compiled_react-dom_10un4u1._.js:10263:9)
    at flushSyncWorkAcrossRoots_imp…
```
</details>

### 12. `http-error` × 1

```
GET http://localhost:3001/api/proxy/users?page=1&per_page=25
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page

**URL:** `http://localhost:3001/api/proxy/users?page=1&per_page=25`
**Status:** 401

### 13. `http-error` × 1

```
GET http://localhost:3001/api/proxy/users/stats
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page

**URL:** `http://localhost:3001/api/proxy/users/stats`
**Status:** 401

### 14. `http-error` × 1

```
GET http://localhost:3001/api/proxy/organizations?page=1&per_page=25
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page

**URL:** `http://localhost:3001/api/proxy/organizations?page=1&per_page=25`
**Status:** 401

### 15. `http-error` × 1

```
GET http://localhost:3001/api/proxy/organizations/stats
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page

**URL:** `http://localhost:3001/api/proxy/organizations/stats`
**Status:** 401

### 16. `http-error` × 1

```
GET http://localhost:3001/api/proxy/roles
```

**Tests affected:** smoke_golden-path_spec_ts__Golden_path_visual_UI_smoke__Page-context_registration_drawer_reflects_current_page

**URL:** `http://localhost:3001/api/proxy/roles`
**Status:** 401
