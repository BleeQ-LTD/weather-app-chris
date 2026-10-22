import { defineConfig } from "vitest/config";

// Config for Firestore security rules tests only.
// These run in Node against the Firestore emulator (started by "npm run test:rules").
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests-rules/**/*.test.ts"],
    testTimeout: 15000,
  },
});