// Publishes the version that's now live to Firebase Remote Config, so open copies
// of the app show "A new version is available".
// Run by .github/workflows/publish-latest-version.yml after a successful production
// deploy. Never run it from a laptop.
//
// In:  APP_VERSION (the deployed commit), and GOOGLE_APPLICATION_CREDENTIALS
//      (set by the workflow's sign-in step; the key itself is never printed).
// Out: Remote Config's `latest_version` set to APP_VERSION, unless it's already
//      that commit or the commit there is newer (a re-deploy of an old commit).

import { execSync } from "node:child_process";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getRemoteConfig } from "firebase-admin/remote-config";
import { shouldPublish } from "./latestVersion.mjs";

const PROJECT_ID = "weather-app-6c101";
const KEY = "latest_version";
const version = (process.env.APP_VERSION ?? "").trim().toLowerCase();

if (!/^[0-9a-f]{40}$/.test(version)) {
  console.error(`APP_VERSION must be a full 40-character commit hash, got "${version}".`);
  process.exit(1);
}

// True if `older` is an ancestor of `newer` in this repository's history
function isAncestor(older, newer) {
  try {
    execSync(`git merge-base --is-ancestor ${older} ${newer}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const remoteConfig = getRemoteConfig();
const template = await remoteConfig.getTemplate();
const current = template.parameters[KEY]?.defaultValue?.value ?? "";

const decision = shouldPublish(current, version, isAncestor);
if (!decision.publish) {
  console.log(`Not publishing ${version.slice(0, 7)}: ${decision.reason} (${KEY} stays ${current.slice(0, 7) || "unset"}).`);
  process.exit(0);
}

template.parameters[KEY] = {
  defaultValue: { value: version },
  valueType: "STRING",
  description: "Commit of the latest production deploy. Set automatically by GitHub Actions; the app shows a reload prompt when it differs from its own build.",
};

// Check the change with Firebase first, then publish it
await remoteConfig.validateTemplate(template);
await remoteConfig.publishTemplate(template);
console.log(`Published ${KEY} = ${version.slice(0, 7)} (was ${current ? current.slice(0, 7) : "not set"}).`);
