import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Playwright fixtures and specs are NOT React code. Their `use(value)`
  // calls are Playwright fixture-injection helpers, not the React 19
  // `use()` hook — but the eslint react-hooks plugin can't tell them
  // apart. Disable hook-rule checks across the e2e tree to silence the
  // false positives (4 errors in tests/e2e/fixtures/base.ts).
  {
    files: ["tests/e2e/**/*.ts", "tests/e2e/**/*.tsx"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Test files use anonymous Wrapper components for QueryClientProvider /
  // intl / etc. injection. Display names matter for production
  // debugging and React DevTools, not test wrappers — those never
  // appear in any UI a human sees. Silence display-name in tests only.
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "react/display-name": "off",
    },
  },
  // Project-wide downgrade for set-state-in-effect → warning. The new
  // React 19 rule flags every `useState + useEffect(setState, [])`
  // hydration pattern — which is the canonical CLAUDE.md guidance for
  // theme/locale/localStorage reads (avoid SSR/CSR markup divergence).
  // Audited case-by-case in batch 33: 1 was a real bug (batch 32 →
  // useSyncExternalStore in use-mobile.ts), the remaining 10 are
  // intentional. Keeping the rule as `warn` preserves the signal
  // without a wall of point-of-use eslint-disable lines that future
  // readers would mistake for noise.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
