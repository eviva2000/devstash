import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
const EMAIL_VERIFICATION_DISABLED_VALUES = new Set(["0", "false", "no", "off"]);
const EMAIL_VERIFICATION_TOKEN_SCOPE = "email-verification";
const PASSWORD_RESET_TOKEN_SCOPE = "password-reset";

export type VerifyEmailTokenResult = "verified" | "expired" | "invalid";
export type ResetPasswordTokenResult = "reset" | "expired" | "invalid";
export type ValidatePasswordResetTokenResult = "valid" | "expired" | "invalid";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createTokenIdentifier(scope: string, email: string) {
  return `${scope}:${normalizeEmail(email)}`;
}

export function isEmailVerificationEnabled() {
  const value = process.env.EMAIL_VERIFICATION_ENABLED;

  if (!value) {
    return true;
  }

  return !EMAIL_VERIFICATION_DISABLED_VALUES.has(value.trim().toLowerCase());
}

export function getSafeCallbackUrl(value?: string) {
  if (!value || value.startsWith("//")) {
    return "/dashboard";
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export async function createEmailVerificationToken(email: string) {
  const identifier = createTokenIdentifier(
    EMAIL_VERIFICATION_TOKEN_SCOPE,
    email
  );
  const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString("base64url");
  const expires = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        expires,
        identifier,
        token: hashToken(token),
      },
    }),
  ]);

  return { expires, token };
}

export function createEmailVerificationUrl({
  callbackUrl,
  email,
  origin,
  token,
}: {
  callbackUrl: string;
  email: string;
  origin: string;
  token: string;
}) {
  const verificationUrl = new URL("/api/auth/verify-email", origin);
  verificationUrl.searchParams.set(
    "callbackUrl",
    getSafeCallbackUrl(callbackUrl)
  );
  verificationUrl.searchParams.set("email", normalizeEmail(email));
  verificationUrl.searchParams.set("token", token);

  return verificationUrl.toString();
}

export async function verifyEmailToken({
  email,
  token,
}: {
  email: string;
  token: string;
}): Promise<VerifyEmailTokenResult> {
  const normalizedEmail = normalizeEmail(email);
  const identifier = createTokenIdentifier(
    EMAIL_VERIFICATION_TOKEN_SCOPE,
    normalizedEmail
  );
  const hashedToken = hashToken(token);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token: hashedToken,
      },
    },
  });

  if (!verificationToken) {
    return "invalid";
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    });

    return "expired";
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    });

    return "invalid";
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    }),
  ]);

  return "verified";
}

export async function createPasswordResetToken(email: string) {
  const identifier = createTokenIdentifier(PASSWORD_RESET_TOKEN_SCOPE, email);
  const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString("base64url");
  const expires = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        expires,
        identifier,
        token: hashToken(token),
      },
    }),
  ]);

  return { expires, token };
}

export function createPasswordResetUrl({
  callbackUrl,
  email,
  origin,
  token,
}: {
  callbackUrl: string;
  email: string;
  origin: string;
  token: string;
}) {
  const resetUrl = new URL("/reset-password", origin);
  resetUrl.searchParams.set("callbackUrl", getSafeCallbackUrl(callbackUrl));
  resetUrl.searchParams.set("email", normalizeEmail(email));
  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
}

export async function validatePasswordResetToken({
  email,
  token,
}: {
  email: string;
  token: string;
}): Promise<ValidatePasswordResetTokenResult> {
  const normalizedEmail = normalizeEmail(email);
  const identifier = createTokenIdentifier(
    PASSWORD_RESET_TOKEN_SCOPE,
    normalizedEmail
  );
  const hashedToken = hashToken(token);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token: hashedToken,
      },
    },
  });

  if (!verificationToken) {
    return "invalid";
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    });

    return "expired";
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    });

    return "invalid";
  }

  return "valid";
}

export async function resetPasswordWithToken({
  email,
  passwordHash,
  token,
}: {
  email: string;
  passwordHash: string;
  token: string;
}): Promise<ResetPasswordTokenResult> {
  const normalizedEmail = normalizeEmail(email);
  const identifier = createTokenIdentifier(
    PASSWORD_RESET_TOKEN_SCOPE,
    normalizedEmail
  );
  const hashedToken = hashToken(token);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token: hashedToken,
      },
    },
  });

  if (!verificationToken) {
    return "invalid";
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    });

    return "expired";
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    });

    return "invalid";
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier } }),
  ]);

  return "reset";
}
