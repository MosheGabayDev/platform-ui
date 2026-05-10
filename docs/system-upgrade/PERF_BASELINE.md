# Perf baseline — 2026-05-10

Snapshot of the production build's static bundle, captured the first
time `npx next build` ran green (post-batch-27 prerender fix). Future
batches that touch perf should compare against these numbers and call
out regressions in the launch-plan Test Status Log.

## Build environment

- Next.js: **16.2.4** (Turbopack production builds)
- Node: as in `package.json` engines
- Captured via: `npx next build` followed by `du -sk .next/static`

## Headline numbers

| Metric | Value |
|---|---|
| `.next/static` total | **3.6 MB** uncompressed |
| `.next/static/chunks` total | 3.4 MB |
| Number of chunks | 71 |
| Largest chunk | 290 KB |
| Pages prerendered | **40 / 40** |

## Top-10 chunks

| Size | Chunk |
|---|---|
| 290 KB | `02mknznnem7t6.js` |
| 277 KB | `0zey9o01ny9vi.js` (likely recharts — only loaded when a chart-bearing page mounts) |
| 222 KB | `0n~dq4kpx9xxx.js` |
| 133 KB | `07kcjvocw5yow.js` |
| 124 KB | `0w5z7-hwkcavo.js` |
| 121 KB | `10xpe-d5d1d0k.js` |
| 117 KB | `0t-8leuxgw9vf.js` |
| 109 KB | `03~yq9q893hmn.js` |
|  84 KB | `063fuknatmdsw.js` |
|  61 KB | `11~m-bj~agrlk.js` |

## Lazy-loaded heavy deps (verified)

- **Recharts (~200 KB + d3 leaves)** — chunk `0zey9o01ny9vi.js`
  contains `AreaChart`. Dynamic import via `next/dynamic` in
  `components/modules/billing/usage-chart.tsx` and
  `components/shared/stats/kpi-sparkline.tsx` keeps it out of the
  initial bundle for `/`, `/billing`, and every dashboard. Confirmed
  via `grep -l AreaChart .next/static/chunks/*.js` — recharts code
  lives in a code-split chunk, not the main entry.

## Profile output

`npm run analyze` runs `next experimental-analyze` (Turbopack native
profiler). Output is a Chrome DevTools tracing dump — open the
profile in `chrome://tracing` to inspect flamegraphs.

The legacy `@next/bundle-analyzer` plugin is still wired in
`next.config.ts` and emits HTML reports when invoked via
`next build --webpack`. Not the default — Turbopack is the production
build path.

## Where this fits

This is the **lower bound** for "we shipped". When sizes climb
materially (>10% on `.next/static` total or any single chunk going
above 350 KB), block the regression and find the cause before adding
more work on top.
