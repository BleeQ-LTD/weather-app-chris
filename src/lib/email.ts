// SERVER ONLY. Sends email through Resend's API.
// RESEND_API_KEY is a secret, so this must never run in the browser.

type Email = {
  to: string;
  subject: string;
  html: string;
  text: string; // plain-text version for email apps that don't show HTML
};

// Until a domain is verified in Resend, only "onboarding@resend.dev" can send,
// and only to the email address the Resend account was created with.
const DEFAULT_FROM = "Weather <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html, text }: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const response = await fetch("https://api.resend.com/emails", {
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

  if (!response.ok) {
    throw new Error(`Resend error ${response.status}: ${await response.text()}`);
  }
}