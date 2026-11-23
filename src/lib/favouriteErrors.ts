// What to tell people when saving, removing or loading favourites fails.
// Every message says the real reason (offline, slow, or our side) so people
// know whether trying again will help. Technical details stay in the console.

// Firestore error codes we can explain (from FirebaseError.code)
const SLOW = ["unavailable", "deadline-exceeded"];
const SIGNED_OUT = ["unauthenticated"];

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code).replace(/^firestore\//, "");
  }
  return "";
}

// In:  the error Firestore threw (or nothing), and whether the browser is online.
// Out: one short sentence to show next to the button, e.g. "You're offline. Reconnect and try again."
export function favouriteErrorReason(error: unknown, isOnline: boolean): string {
  if (!isOnline) return "You're offline. Reconnect and try again.";
  const code = errorCode(error);
  if (SLOW.includes(code)) return "The connection is too slow right now. Try again in a moment.";
  if (SIGNED_OUT.includes(code)) return "You've been signed out. Sign in again, then try again.";
  return "Something went wrong on our side. Try again in a moment.";
}

// navigator.onLine, or true where there is no browser (tests, server)
export function browserIsOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
