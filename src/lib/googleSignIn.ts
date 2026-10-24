import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Signs in with Google. This is also sign-up: if no account exists for this
// Google account, Firebase creates one. Google gives us the name, email and photo,
// but not gender, so new Google users finish their profile on /complete-profile.
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // Always show Google's account chooser, instead of silently reusing the last account
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}