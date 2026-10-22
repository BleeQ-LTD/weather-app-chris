// Firestore security rules tests.
// Run with: npm run test:rules  (starts the Firestore emulator automatically)
//
// Characters:
//   alice   - signed-in user who owns the data being tested
//   bob     - another signed-in user who tries to access Alice's data
//   visitor - someone who isn't signed in

import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

// Each character gets their own view of the database
const alice = () => testEnv.authenticatedContext("alice").firestore();
const bob = () => testEnv.authenticatedContext("bob").firestore();
const visitor = () => testEnv.unauthenticatedContext().firestore();

// Valid data that should always be accepted for the owner
const validProfile = () => ({
  name: "Alice",
  email: "alice@example.com",
  gender: "female",
  createdAt: serverTimestamp(),
});

const validFavourite = () => ({
  name: "Lagos",
  lat: 6.45,
  lon: 3.39,
  createdAt: serverTimestamp(),
});

// Put Alice's existing data in place, skipping the rules (like an admin would)
async function seedAliceData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/alice"), { ...validProfile(), createdAt: new Date() });
    await setDoc(doc(db, "users/alice/favourites/lagos"), { ...validFavourite(), createdAt: new Date() });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-weather-app-chris",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("a user's own data", () => {
  it("lets Alice create her own profile", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), validProfile()));
  });

  it("lets Alice read her own profile", async () => {
    await seedAliceData();
    await assertSucceeds(getDoc(doc(alice(), "users/alice")));
  });

  it("lets Alice change her name", async () => {
    await seedAliceData();
    await assertSucceeds(updateDoc(doc(alice(), "users/alice"), { name: "Alice B" }));
  });

  it("lets Alice save a favourite", async () => {
    await seedAliceData();
    await assertSucceeds(setDoc(doc(alice(), "users/alice/favourites/abuja"), validFavourite()));
  });

  it("lets Alice read her favourites", async () => {
    await seedAliceData();
    await assertSucceeds(getDoc(doc(alice(), "users/alice/favourites/lagos")));
  });

  it("lets Alice delete her favourite", async () => {
    await seedAliceData();
    await assertSucceeds(deleteDoc(doc(alice(), "users/alice/favourites/lagos")));
  });
});

describe("another user's data (Bob attacking Alice)", () => {
  it("stops Bob reading Alice's profile", async () => {
    await seedAliceData();
    await assertFails(getDoc(doc(bob(), "users/alice")));
  });

  it("stops Bob editing Alice's profile", async () => {
    await seedAliceData();
    await assertFails(updateDoc(doc(bob(), "users/alice"), { name: "Hacked" }));
  });

  it("stops Bob creating a profile under Alice's ID", async () => {
    await assertFails(setDoc(doc(bob(), "users/alice"), validProfile()));
  });

  it("stops Bob adding a favourite to Alice's list", async () => {
    await seedAliceData();
    await assertFails(setDoc(doc(bob(), "users/alice/favourites/accra"), validFavourite()));
  });

  it("stops Bob reading Alice's favourites", async () => {
    await seedAliceData();
    await assertFails(getDoc(doc(bob(), "users/alice/favourites/lagos")));
  });

  it("stops Bob deleting Alice's favourite", async () => {
    await seedAliceData();
    await assertFails(deleteDoc(doc(bob(), "users/alice/favourites/lagos")));
  });
});

describe("signed-out visitors", () => {
  it("can't read a user's profile", async () => {
    await seedAliceData();
    await assertFails(getDoc(doc(visitor(), "users/alice")));
  });

  it("can't create a profile", async () => {
    await assertFails(setDoc(doc(visitor(), "users/alice"), validProfile()));
  });

  it("can't read a user's favourites", async () => {
    await seedAliceData();
    await assertFails(getDoc(doc(visitor(), "users/alice/favourites/lagos")));
  });
});

describe("invalid data is rejected", () => {
   it("rejects a profile with no name", async () => {
    const noName: Record<string, unknown> = { ...validProfile() };
    delete noName.name;
    await assertFails(setDoc(doc(alice(), "users/alice"), noName));
  });

  it("rejects a name longer than 50 characters", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...validProfile(), name: "a".repeat(51) }));
  });

  it("rejects a gender that isn't one of the options", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...validProfile(), gender: "robot" }));
  });

  it("rejects a protected field the user shouldn't set (role)", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...validProfile(), role: "admin" }));
  });

  it("rejects a made-up createdAt date instead of the server time", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...validProfile(), createdAt: new Date(2000, 0, 1) }));
  });

  it("stops Alice changing her createdAt later", async () => {
    await seedAliceData();
    await assertFails(updateDoc(doc(alice(), "users/alice"), { createdAt: new Date(2000, 0, 1) }));
  });

  it("rejects a favourite with a latitude that isn't a number", async () => {
    await seedAliceData();
    await assertFails(setDoc(doc(alice(), "users/alice/favourites/abuja"), { ...validFavourite(), lat: "north" }));
  });

  it("rejects a favourite with an impossible latitude", async () => {
    await seedAliceData();
    await assertFails(setDoc(doc(alice(), "users/alice/favourites/abuja"), { ...validFavourite(), lat: 200 }));
  });
});

describe("everything else is denied by default", () => {
  it("stops a signed-in user reading an unknown collection", async () => {
    await assertFails(getDoc(doc(alice(), "admin/settings")));
  });

  it("stops a signed-in user writing to an unknown collection", async () => {
    await assertFails(setDoc(doc(alice(), "admin/settings"), { open: true }));
  });
});