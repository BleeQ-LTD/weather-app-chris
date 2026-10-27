import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { sendEmail } from "@/lib/email";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

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
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "That email address doesn't look right." } },
      { status: 400 }
    );
  }

  // Where the link should open. This comes from configuration, NEVER from the request's
  // Host header: otherwise an attacker could make us email a reset link pointing at their
  // own site ("password reset poisoning").
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error("[reset-password] APP_URL is not set");
    return serviceError();
  }

  let oobCode: string | null;
  try {
    const firebaseLink = await getAdminAuth().generatePasswordResetLink(email);
    oobCode = new URL(firebaseLink).searchParams.get("oobCode");
  } catch (error) {
    if (isNoSuchUser(error)) {
      // Logged on the server only; the user still sees the same "sent" message
      console.info("[reset-password] No account found for this email, so no email was sent");
      return sent();
   }
    console.error("[reset-password] Could not generate reset link:", error);
    return serviceError();
  }

  if (!oobCode) {
    console.error("[reset-password] Reset link had no oobCode");
    return serviceError();
  }

  const resetLink = `${appUrl}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

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
    return serviceError();
  }

  console.info("[reset-password] Reset email sent");
  return sent();
}

function isNoSuchUser(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "auth/user-not-found" || code === "auth/email-not-found";
}

function serviceError() {
  return NextResponse.json(
    { error: { code: "RESET_FAILED", message: "We couldn't send the email right now. Please try again." } },
    { status: 502 }
  );
}