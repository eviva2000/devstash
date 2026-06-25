import {
  createPasswordResetToken,
  createPasswordResetUrl,
  getSafeCallbackUrl,
  normalizeEmail,
} from "@/lib/auth/email-verification";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/prisma";

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const callbackUrl = getSafeCallbackUrl(getStringValue(input.callbackUrl));
  const email = normalizeEmail(getStringValue(input.email));

  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      name: true,
      passwordHash: true,
    },
  });

  if (!user?.email || !user.passwordHash) {
    return Response.json({ ok: true });
  }

  try {
    const passwordResetToken = await createPasswordResetToken(email);
    const resetUrl = createPasswordResetUrl({
      callbackUrl,
      email,
      origin: new URL(request.url).origin,
      token: passwordResetToken.token,
    });

    await sendPasswordResetEmail({
      email,
      name: user.name,
      resetUrl,
    });
  } catch (error) {
    console.error("Unable to send password reset email.", error);
  }

  return Response.json({ ok: true });
}
