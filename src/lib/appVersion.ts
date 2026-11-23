// This build's version: the git commit it was built from (set in next.config.ts).
// Empty when the update check is off (local development, preview deploys, no git info).
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

const COMMIT = /^[0-9a-f]{7,40}$/i;

// In:  the version published in Remote Config, and this build's version.
// Out: true when the published one is a different commit, so a newer version is live.
//
// Commits can't be put in order on their own, so "different" means "newer" here.
// That's safe because the GitHub Action only ever publishes a production deploy of
// main, and refuses to publish a commit that's older than the one already there.
// Short and full commit hashes are compared by their common start ("ac8e549" = "ac8e549a…").
export function isNewerVersion(published: string, current: string): boolean {
  const remote = published.trim().toLowerCase();
  const mine = current.trim().toLowerCase();
  if (!COMMIT.test(remote) || !COMMIT.test(mine)) return false; // missing or unexpected: never prompt
  const length = Math.min(remote.length, mine.length);
  return remote.slice(0, length) !== mine.slice(0, length);
}

// "ac8e549aac24…" -> "ac8e549", for showing in the footer
export function shortVersion(version: string): string {
  return COMMIT.test(version) ? version.slice(0, 7) : "";
}
