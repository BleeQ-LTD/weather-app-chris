import { NextResponse } from "next/server";
import { EmailError, sendEmail } from "@/lib/email";

// POST /api/reset-password  { "email": "someone@example.com" }
//
// Why this runs on the server: Firebase's own reset email can only link to Firebase's
// page on this project (the email template can't be changed), so we send the email
// ourselves. Generating the reset code needs the Admin SDK, whose key must stay on
// the server.
//
// 1. Admin SDK creates a reset link, which contains the secret one-time oobCode
// 2. We take the oobCode out and build a link to OUR /auth/action page
// 3. Resend emails that link
//
// Errors: every failure returns its own code and a message written for users, so the
// page can say what actually went wrong. Technical details (stack traces, provider
// messages, key names) are only written to the server log, never sent to the browser.
// The one thing we never reveal is whether an account exists.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

type ErrorCode =
  | "INVALID_EMAIL" // the address is malformed
  | "TOO_MANY_REQUESTS" // Firebase or Resend is rate-limiting us
  | "SERVER_MISCONFIGURED" // a missing/invalid key or setting on our side
  | "AUTH_SERVICE_UNAVAILABLE" // couldn't reach Firebase, or it failed
  | "EMAIL_SERVICE_UNAVAILABLE" // couldn't reach Resend, or it failed
  | "EMAIL_REJECTED"; // Resend refused to send to this address

const ERRORS: Record<ErrorCode, { status: number; message: string }> = {
  INVALID_EMAIL: {
    status: 400,
    message: "Please enter a valid email address.",
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    message: "You've asked for a few reset links already. Please wait a few minutes and try again.",
  },
  SERVER_MISCONFIGURED: {
    status: 500,
    message: "We can't send reset emails at the moment. Please try again later.",
  },
  AUTH_SERVICE_UNAVAILABLE: {
    status: 503,
    message: "Something went wrong on our end. Please try again in a moment.",
  },
  EMAIL_SERVICE_UNAVAILABLE: {
    status: 503,
    message: "We couldn't send the email just now. Please try again in a moment.",
  },
  EMAIL_REJECTED: {
    status: 422,
    message: "We couldn't send an email to that address. Please check it and try again.",
  },
};
function fail(code: ErrorCode) {
  const { status, message } = ERRORS[code];
  return NextResponse.json({ error: { code, message } }, { status });
}

// Same answer whether or not an account exists, so this can't be used
// to find out who has an account. (A new response each time: a response
// can only be sent once.)
function sent() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return fail("INVALID_EMAIL");
  }

  // Where the link should open. This comes from configuration, NEVER from the request's
  // Host header: otherwise an attacker could make us email a reset link pointing at their
  // own site ("password reset poisoning").
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error("[reset-password] APP_URL is not set");
    return fail("SERVER_MISCONFIGURED");
  }

  // Step 1: ask Firebase (Admin SDK) for a reset code.
  // The Admin SDK is loaded here, inside try, instead of at the top of the file: if the
  // package itself fails to load (as with the ERR_REQUIRE_ESM error on Vercel), we
  // return a clear SERVER_MISCONFIGURED instead of an unexplained 500.
  let oobCode: string | null;
  try {
    const { getAdminAuth } = await import("@/lib/firebaseAdmin");
    const firebaseLink = await getAdminAuth().generatePasswordResetLink(email);
    oobCode = new URL(firebaseLink).searchParams.get("oobCode");
  } catch (error) {
    const code = firebaseErrorCode(error);

    if (code === "auth/user-not-found" || code === "auth/email-not-found") {
      // Logged on the server only; the user still sees the same "sent" message
      console.info("[reset-password] No account found for this email, so no email was sent");
      return sent();
    }
    if (code === "auth/invalid-email") {
      return fail("INVALID_EMAIL");
    }
    if (code === "auth/too-many-requests") {
      console.warn("[reset-password] Firebase is rate-limiting reset requests");
      return fail("TOO_MANY_REQUESTS");
    }
    if (isOurSetupProblem(code, error)) {
      console.error("[reset-password] Admin SDK setup problem:", code ?? "", error);
      return fail("SERVER_MISCONFIGURED");
    }

    console.error("[reset-password] Could not generate reset link:", code ?? "", error);
    return fail("AUTH_SERVICE_UNAVAILABLE");
  }

  if (!oobCode) {
    console.error("[reset-password] Reset link had no oobCode");
    return fail("AUTH_SERVICE_UNAVAILABLE");
  }

  const resetLink = `${appUrl}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

  // Step 2: send the email with Resend
  try {
    await sendEmail({
      to: email,
      subject: "Reset your Weather password",
      text: [
        "Hello,",
        "",
        "Use this link to choose a new password for your Weather account:",
        resetLink,
        "",
        "If you didn't ask to reset your password, you can ignore this email.",
      ].join("\n"),
      html: `
        <p>Hello,</p>
        <p>Use the link below to choose a new password for your Weather account.</p>
        <p><a href="${resetLink}">Reset my password</a></p>
        <p>If you didn't ask to reset your password, you can ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error("[reset-password] Could not send email:", error);
    if (error instanceof EmailError) {
      if (error.kind === "config") return fail("SERVER_MISCONFIGURED");
      if (error.kind === "rate-limited") return fail("TOO_MANY_REQUESTS");
      if (error.kind === "rejected") return fail("EMAIL_REJECTED");
    }
    return fail("EMAIL_SERVICE_UNAVAILABLE");
  }

  console.info("[reset-password] Reset email sent");
  return sent();
}

// Firebase Admin errors carry a code like "auth/user-not-found"
function firebaseErrorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}

// Problems only we can fix: a bad or missing service account key, missing permissions,
// the wrong project, or the Admin SDK package failing to load
function isOurSetupProblem(code: string | undefined, error: unknown): boolean {
  if (
    code === "auth/invalid-credential" ||
    code === "app/invalid-credential" ||
    code === "auth/insufficient-permission" ||
    code === "auth/project-not-found" ||
    code === "ERR_REQUIRE_ESM" ||
    code === "MODULE_NOT_FOUND"
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("ADMIN_SERVICE_ACCOUNT_KEY") || // key not set
    message.includes("JSON") || // key pasted incompletely
    message.includes("Failed to load external module") // package failed to load
  );
}