const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "DevStash <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getVerificationEmailHtml({
  name,
  verificationUrl,
}: {
  name: string;
  verificationUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safeVerificationUrl = escapeHtml(verificationUrl);

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Verify your DevStash email</h1>
      <p style="margin: 0 0 16px;">Hi ${safeName},</p>
      <p style="margin: 0 0 20px;">Click the button below to verify your email address.</p>
      <p style="margin: 0 0 20px;">
        <a href="${safeVerificationUrl}" style="display: inline-block; background: #ffffff; border: 1px solid #111827; border-radius: 8px; color: #111827; padding: 10px 16px; text-decoration: none;">
          Verify email
        </a>
      </p>
      <p style="margin: 0 0 16px;">This link expires in 24 hours.</p>
      <p style="color: #4b5563; font-size: 14px; margin: 0;">If the button does not work, open this link: ${safeVerificationUrl}</p>
    </div>
  `;
}

function getPasswordResetEmailHtml({
  name,
  resetUrl,
}: {
  name: string;
  resetUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your DevStash password</h1>
      <p style="margin: 0 0 16px;">Hi ${safeName},</p>
      <p style="margin: 0 0 20px;">Click the button below to choose a new password.</p>
      <p style="margin: 0 0 20px;">
        <a href="${safeResetUrl}" style="display: inline-block; background: #ffffff; border: 1px solid #111827; border-radius: 8px; color: #111827; padding: 10px 16px; text-decoration: none;">
          Reset password
        </a>
      </p>
      <p style="margin: 0 0 16px;">This link expires in 1 hour.</p>
      <p style="color: #4b5563; font-size: 14px; margin: 0;">If the button does not work, open this link: ${safeResetUrl}</p>
    </div>
  `;
}

async function sendEmail({
  html,
  subject,
  text,
  to,
}: {
  html: string;
  subject: string;
  text: string;
  to: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set before sending email.");
  }

  const response = await fetch(RESEND_EMAIL_ENDPOINT, {
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL,
      html,
      subject,
      text,
      to,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Resend rejected the email request.");
  }
}

export async function sendVerificationEmail({
  email,
  name,
  verificationUrl,
}: {
  email: string;
  name?: string | null;
  verificationUrl: string;
}) {
  const displayName = name?.trim() || "there";

  await sendEmail({
    html: getVerificationEmailHtml({
      name: displayName,
      verificationUrl,
    }),
    subject: "Verify your DevStash email",
    text: [
      `Hi ${displayName},`,
      "",
      "Verify your DevStash email by opening this link:",
      verificationUrl,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
    to: email,
  });
}

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: {
  email: string;
  name?: string | null;
  resetUrl: string;
}) {
  const displayName = name?.trim() || "there";

  await sendEmail({
    html: getPasswordResetEmailHtml({
      name: displayName,
      resetUrl,
    }),
    subject: "Reset your DevStash password",
    text: [
      `Hi ${displayName},`,
      "",
      "Reset your DevStash password by opening this link:",
      resetUrl,
      "",
      "This link expires in 1 hour.",
    ].join("\n"),
    to: email,
  });
}
