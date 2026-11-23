import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// Which version this build is: the git commit it was built from. The update prompt
// compares it with `latest_version` in Firebase Remote Config (see README, "Update prompt").
// An empty value turns the update check off for this build, which is what we want
// for Vercel preview deploys and local development (they're never "the latest").
function buildVersion(): string {
  if (process.env.NODE_ENV !== "production") return "";
  // Vercel: only production deploys take part; previews would always look out of date
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return "";
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  // Set by hand, e.g. NEXT_PUBLIC_APP_VERSION=$(git rev-parse HEAD) npm run build
  if (process.env.NEXT_PUBLIC_APP_VERSION) return process.env.NEXT_PUBLIC_APP_VERSION;
  // Anywhere else with the git history available (e.g. a local production build)
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return ""; // no git here: the update check is off for this build
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: buildVersion(),
  },
};

export default nextConfig;
