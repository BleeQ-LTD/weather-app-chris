import { FirebaseError } from "firebase/app";

// Firebase gives error codes like "auth/weak-password".
// We turn them into messages written for users, not developers.
const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/weak-password": "That password is too weak. Use at least 8 characters.",
  "auth/missing-password": "Please enter a password.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/wrong-password": "The email or password is incorrect.",
  "auth/user-not-found": "The email or password is incorrect.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "You seem to be offline. Check your connection and try again.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
  "auth/unauthorized-domain": "Google sign-in isn't available on this web address. Please sign in with email and password instead.",
  "auth/operation-not-allowed": "This sign-in method isn't turned on yet. Please try another way to sign in.",
  "auth/missing-email": "Please enter your email.",
  "auth/expired-action-code": "This link has expired. Request a new one.",
  "auth/invalid-action-code": "This link has already been used or isn't valid. Request a new one.",
  "auth/unauthorized-continue-uri": "Password reset isn't set up for this web address yet. Please try from the main site.",
  "auth/invalid-continue-uri": "Password reset isn't set up correctly. Please try again later.",
  "auth/missing-continue-uri": "Password reset isn't set up correctly. Please try again later.",
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  // Anything we haven't handled still gets a message meant for users
  console.error("[auth] Unhandled error:", error);
  return "Something went wrong. Please try again.";
}