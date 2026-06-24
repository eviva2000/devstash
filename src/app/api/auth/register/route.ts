import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

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

  if (!name || !email || !password || !confirmPassword) {
    return Response.json(
      { error: "Name, email, password, and confirmPassword are required." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return Response.json({ error: "Passwords do not match." }, { status: 400 });
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

  try {
    const user = await prisma.user.create({
      data: {
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

    return Response.json({ user }, { status: 201 });
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
