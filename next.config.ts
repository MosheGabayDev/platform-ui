import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project so Next.js doesn't get
  // confused by a stray package-lock.json under the user's home directory.
  // Without this, the dev server prints a "multiple lockfiles" warning and
  // may infer the wrong root for module resolution.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
