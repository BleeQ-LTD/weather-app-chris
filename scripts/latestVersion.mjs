// The decision behind scripts/publish-latest-version.mjs, kept separate so it can be tested.
//
// In:  current  - the commit now in Remote Config ("" if none yet)
//      next     - the commit that was just deployed
//      isAncestor(older, newer) - true if `older` comes before `newer` in git history
// Out: { publish: true } or { publish: false, reason }

const FULL_COMMIT = /^[0-9a-f]{40}$/;

export function shouldPublish(current, next, isAncestor) {
  if (!FULL_COMMIT.test(next)) return { publish: false, reason: "not a full commit hash" };
  if (current === next) return { publish: false, reason: "already published" };
  // Re-deploying an older commit must not tell everyone to "update" to older code
  if (FULL_COMMIT.test(current) && isAncestor(next, current)) {
    return { publish: false, reason: "older than the published commit" };
  }
  return { publish: true };
}
