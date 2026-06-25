"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_PASSWORD_LENGTH = 8;

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

  return "Unable to reset password.";
}

export function ResetPasswordForm({
  callbackUrl,
  email,
  token,
}: {
  callbackUrl: string;
  email: string;
  token: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const forgotPasswordHref = useMemo(
    () => `/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    [callbackUrl]
  );

  if (!email || !token) {
    return (
      <div className="space-y-5">
        <p
          aria-live="polite"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          This password reset link is invalid.
        </p>
        <Link
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium underline-offset-4 hover:bg-muted hover:text-foreground"
          href={forgotPasswordHref}
        >
          Request a new link
        </Link>
      </div>
    );
  }

  const handleSubmit: React.ComponentProps<"form">["onSubmit"] = async (
    event
  ) => {
    event.preventDefault();
    setError("");

    if (!password) {
      setError("Enter a new password.");
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
    const response = await fetch("/api/auth/reset-password", {
      body: JSON.stringify({
        confirmPassword,
        email,
        password,
        token,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsPending(false);

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    router.push(
      `/sign-in?reset=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
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
          <label className="text-sm font-medium" htmlFor="password">
            New password
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
          <span>{isPending ? "Saving password" : "Reset password"}</span>
          <ArrowRight data-icon="inline-end" />
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Need a fresh link?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={forgotPasswordHref}
        >
          Request one
        </Link>
      </p>
    </div>
  );
}
