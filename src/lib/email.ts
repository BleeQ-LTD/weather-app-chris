// SERVER ONLY. Sends email through Resend's API.
// RESEND_API_KEY is a secret, so this must never run in the browser.

type Email = {
  to: string;
  subject: string;
  html: string;
  text: string; // plain-text version for email apps that don't show HTML
};

// Why sending failed, so the caller can tell the user something accurate
export type EmailErrorKind =
  | "config" // our setup: missing/invalid API key, or sender/domain not allowed
  | "rate-limited" // too many emails too quickly
  | "rejected" // Resend refused this recipient (e.g. an invalid address)
  | "unavailable"; // couldn't reach Resend, or Resend had a problem

export class EmailError extends Error {
  constructor(
    public kind: EmailErrorKind,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "EmailError";
  }
}

// Until a domain is verified in Resend, only "onboarding@resend.dev" can send,
// and only to the email address the Resend account was created with.
const DEFAULT_FROM = "Weather <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html, text }: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new EmailError("config", "RESEND_API_KEY is not set");

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
    });
  } catch (error) {
    // The request never got an answer: no internet, DNS failure, timeout
    throw new EmailError("unavailable", `Could not reach Resend: ${String(error)}`);
  }

  if (response.ok) return;

  // Resend explains the problem in the body; keep it for the server log
  const detail = await response.text().catch(() => "");
  const status = response.status;

  if (status === 401 || status === 403) {
    // 401: bad API key. 403: sender or domain not allowed (e.g. an unverified domain,
    // or sending to someone other than the account owner while in testing mode)
    throw new EmailError("config", `Resend refused the request (${status}): ${detail}`, status);
  }
  if (status === 429) {
    throw new EmailError("rate-limited", `Resend rate limit (${status}): ${detail}`, status);
  }
  if (status === 400 || status === 422) {
    throw new EmailError("rejected", `Resend rejected the email (${status}): ${detail}`, status);
  }
  throw new EmailError("unavailable", `Resend error (${status}): ${detail}`, status);
}