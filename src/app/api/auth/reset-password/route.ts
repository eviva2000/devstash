import bcrypt from "bcryptjs";

import {
  resetPasswordWithToken,
  validatePasswordResetToken,
} from "@/lib/auth/email-verification";
import {
  checkRateLimit,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";

const MIN_PASSWORD_LENGTH = 8;

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getPasswordValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit("resetPassword", getClientIp(request));

  if (!rateLimit.success) {
    return tooManyRequestsResponse(rateLimit.reset);
  }

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
  const confirmPassword = getPasswordValue(input.confirmPassword);
  const email = getStringValue(input.email);
  const password = getPasswordValue(input.password);
  const token = getStringValue(input.token);

  if (!email || !token || !password || !confirmPassword) {
    return Response.json(
      { error: "Email, token, password, and confirmPassword are required." },
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

  const tokenStatus = await validatePasswordResetToken({ email, token });

  if (tokenStatus === "expired") {
    return Response.json(
      { error: "This password reset link has expired." },
      { status: 400 }
    );
  }

  if (tokenStatus === "invalid") {
    return Response.json(
      { error: "This password reset link is invalid or has already been used." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await resetPasswordWithToken({
    email,
    passwordHash,
    token,
  });

  if (result === "expired") {
    return Response.json(
      { error: "This password reset link has expired." },
      { status: 400 }
    );
  }

  if (result === "invalid") {
    return Response.json(
      { error: "This password reset link is invalid or has already been used." },
      { status: 400 }
    );
  }

  return Response.json({ ok: true });
}
