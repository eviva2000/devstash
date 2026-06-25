import bcrypt from "bcryptjs";

import {
  createEmailVerificationToken,
  createEmailVerificationUrl,
  getSafeCallbackUrl,
  isEmailVerificationEnabled,
} from "@/lib/auth/email-verification";
import { sendVerificationEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 8;

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getPasswordValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
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
  const name = getStringValue(input.name);
  const email = getStringValue(input.email).toLowerCase();
  const password = getPasswordValue(input.password);
  const confirmPassword = getPasswordValue(input.confirmPassword);
  const callbackUrl = getSafeCallbackUrl(getStringValue(input.callbackUrl));

  if (!name || !email || !password || !confirmPassword) {
    return Response.json(
      { error: "Name, email, password, and confirmPassword are required." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return Response.json({ error: "Passwords do not match." }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return Response.json(
      { error: "A user with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationEnabled = isEmailVerificationEnabled();

  try {
    const user = await prisma.user.create({
      data: {
        emailVerified: emailVerificationEnabled ? null : new Date(),
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!emailVerificationEnabled) {
      return Response.json(
        { emailSent: false, verificationRequired: false, user },
        { status: 201 }
      );
    }

    const verificationToken = await createEmailVerificationToken(email);
    const verificationUrl = createEmailVerificationUrl({
      callbackUrl,
      email,
      origin: new URL(request.url).origin,
      token: verificationToken.token,
    });

    let emailSent = true;

    try {
      await sendVerificationEmail({
        email,
        name: user.name,
        verificationUrl,
      });
    } catch (error) {
      emailSent = false;
      console.error("Unable to send verification email.", error);
    }

    return Response.json(
      { emailSent, verificationRequired: true, user },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Unable to register user." },
      { status: 500 }
    );
  }
}
