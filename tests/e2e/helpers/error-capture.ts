/**
 * Browser-side error capture for Playwright tests.
 *
 * Hooks into a Page and collects:
 *   - console.error / console.warn entries
 *   - uncaught exceptions (`pageerror`)
 *   - failed network requests (4xx/5xx + `requestfailed`)
 *   - hydration mismatches (Next.js / React DevTools warnings in console)
 *
 * Each captured event is enriched with the route at capture time, then written
 * (per-test) to `test-results/error-capture/<spec>-<test>.json` for aggregation
 * by `scripts/aggregate-e2e-errors.mjs`.
 */
import type { Page, ConsoleMessage, Request, Response } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ErrorKind =
  | "console-error"
  | "console-warning"
  | "page-error"
  | "request-failed"
  | "http-error";

export interface CapturedError {
  kind: ErrorKind;
  route: string;
  message: string;
  url?: string;
  status?: number;
  stack?: string;
  timestamp: string;
}

const IGNORED_PATTERNS: RegExp[] = [
  // Next.js dev-mode HMR pings
  /Fast Refresh/i,
  // React DevTools install hint
  /Download the React DevTools/i,
  // Tolerate the deprecated middleware->proxy warning Next 16 logs
  /middleware.*deprecated/i,
];

export function shouldIgnore(message: string): boolean {
  return IGNORED_PATTERNS.some((re) => re.test(message));
}

export class ErrorCapture {
  readonly errors: CapturedError[] = [];
  private currentRoute = "(initial)";

  constructor(private readonly page: Page) {
    page.on("console", this.handleConsole);
    page.on("pageerror", this.handlePageError);
    page.on("requestfailed", this.handleRequestFailed);
    page.on("response", this.handleResponse);
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        this.currentRoute = page.url();
      }
    });
  }

  private handleConsole = (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    const text = msg.text();
    if (shouldIgnore(text)) return;
    this.errors.push({
      kind: type === "error" ? "console-error" : "console-warning",
      route: this.currentRoute,
      message: text,
      timestamp: new Date().toISOString(),
    });
  };

  private handlePageError = (err: Error) => {
    this.errors.push({
      kind: "page-error",
      route: this.currentRoute,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  };

  private handleRequestFailed = (req: Request) => {
    const failure = req.failure();
    this.errors.push({
      kind: "request-failed",
      route: this.currentRoute,
      message: failure?.errorText ?? "request failed",
      url: req.url(),
      timestamp: new Date().toISOString(),
    });
  };

  private handleResponse = (res: Response) => {
    const status = res.status();
    if (status < 400) return;
    // Ignore intentional auth bounces and HMR
    const url = res.url();
    if (url.includes("/_next/")) return;
    this.errors.push({
      kind: "http-error",
      route: this.currentRoute,
      message: `${res.request().method()} ${url}`,
      url,
      status,
      timestamp: new Date().toISOString(),
    });
  };

  persist(label: string): string | null {
    if (this.errors.length === 0) return null;
    const dir = join(process.cwd(), "test-results", "error-capture");
    mkdirSync(dir, { recursive: true });
    const safe = label.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 120);
    const file = join(dir, `${safe}.json`);
    writeFileSync(file, JSON.stringify(this.errors, null, 2));
    return file;
  }
}
