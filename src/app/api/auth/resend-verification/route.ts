import {
  createEmailVerificationToken,
  createEmailVerificationUrl,
  getSafeCallbackUrl,
  normalizeEmail,
} from "@/lib/auth/email-verification";
import { sendVerificationEmail } from "@/lib/email/resend";
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
  const email = normalizeEmail(getStringValue(input.email));
  const callbackUrl = getSafeCallbackUrl(getStringValue(input.callbackUrl));

  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      emailVerified: true,
      name: true,
      passwordHash: true,
    },
  });

  if (!user || user.emailVerified || !user.passwordHash) {
    return Response.json({ ok: true });
  }

  const verificationToken = await createEmailVerificationToken(email);
  const verificationUrl = createEmailVerificationUrl({
    callbackUrl,
    email,
    origin: new URL(request.url).origin,
    token: verificationToken.token,
  });

  try {
    await sendVerificationEmail({
      email,
      name: user.name,
      verificationUrl,
    });
  } catch (error) {
    console.error("Unable to resend verification email.", error);

    return Response.json(
      { error: "Unable to send verification email." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
