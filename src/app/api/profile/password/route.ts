import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 8;

type ChangePasswordRequestBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

function getPasswordValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
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

  const input = body as ChangePasswordRequestBody;
  const currentPassword = getPasswordValue(input.currentPassword);
  const newPassword = getPasswordValue(input.newPassword);
  const confirmPassword = getPasswordValue(input.confirmPassword);

  if (!currentPassword || !newPassword || !confirmPassword) {
    return Response.json(
      { error: "Current password, new password, and confirmation are required." },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return Response.json({ error: "Passwords do not match." }, { status: 400 });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accounts: { select: { provider: true } },
      passwordHash: true,
    },
  });

  const hasOAuthAccount =
    user?.accounts.some((account) => account.provider !== "credentials") ??
    false;

  if (!user?.passwordHash || hasOAuthAccount) {
    return Response.json(
      { error: "Password changes are only available for email accounts." },
      { status: 400 }
    );
  }

  const currentPasswordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!currentPasswordMatches) {
    return Response.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return Response.json({ ok: true });
}
