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
]);

export default eslintConfig;
