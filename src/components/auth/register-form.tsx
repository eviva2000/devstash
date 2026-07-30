"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function GitHubIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.5v-1.74c-2.78.62-3.37-1.38-3.37-1.38-.46-1.19-1.11-1.51-1.11-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.94c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .28.18.6.69.5A10.18 10.18 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);

  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  return "Unable to create account.";
}

async function readRegistrationResult(response: Response) {
  const body: unknown = await response.json().catch(() => null);

  let emailSent = true;
  let verificationRequired = true;

  if (
    typeof body === "object" &&
    body !== null &&
    "emailSent" in body &&
    typeof body.emailSent === "boolean"
  ) {
    emailSent = body.emailSent;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "verificationRequired" in body &&
    typeof body.verificationRequired === "boolean"
  ) {
    verificationRequired = body.verificationRequired;
  }

  return { emailSent, verificationRequired };
}

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const signInHref = useMemo(
    () => `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    [callbackUrl]
  );

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (
    event
  ) => {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter a password.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);
    const response = await fetch("/api/auth/register", {
      body: JSON.stringify({
        confirmPassword,
        callbackUrl,
        email: normalizedEmail,
        name: trimmedName,
        password,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsPending(false);

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const result = await readRegistrationResult(response);

    if (!result.verificationRequired) {
      router.push(
        `/sign-in?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
      );
      return;
    }

    const verifyEmailParams = new URLSearchParams({
      callbackUrl,
      email: normalizedEmail,
      sent: result.emailSent ? "1" : "0",
    });

    router.push(`/verify-email?${verifyEmailParams.toString()}`);
  };

  return (
    <div className="space-y-5">
      {error && (
        <p
          aria-live="polite"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <Input
            autoComplete="name"
            id="name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Input
            autoComplete="new-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            required
            type="password"
            value={password}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="confirmPassword">
            Confirm password
          </label>
          <Input
            autoComplete="new-password"
            id="confirmPassword"
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={MIN_PASSWORD_LENGTH}
            required
            type="password"
            value={confirmPassword}
          />
        </div>
        <Button className="w-full" disabled={isPending} size="lg" type="submit">
          <span>{isPending ? "Creating account" : "Create account"}</span>
          <ArrowRight data-icon="inline-end" />
        </Button>
      </form>

      <div className="relative py-1 text-center text-xs text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:border-t before:border-border">
        <span className="relative bg-card px-2">or</span>
      </div>

      <Button
        className="w-full"
        onClick={() => signIn("github", { callbackUrl })}
        size="lg"
        type="button"
        variant="outline"
      >
        <GitHubIcon />
        <span>Continue with GitHub</span>
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={signInHref}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
