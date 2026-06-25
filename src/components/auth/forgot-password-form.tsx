"use client";

import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  return "Unable to request a password reset.";
}

export function ForgotPasswordForm({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsPending(true);
    const response = await fetch("/api/auth/forgot-password", {
      body: JSON.stringify({ callbackUrl, email: normalizedEmail }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsPending(false);

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setMessage("If an account exists, we sent a password reset link.");
  };

  return (
    <div className="space-y-5">
      {message && (
        <p
          aria-live="polite"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
        >
          {message}
        </p>
      )}
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
        <Button className="w-full" disabled={isPending} size="lg" type="submit">
          <Mail data-icon="inline-start" />
          <span>{isPending ? "Sending" : "Send reset link"}</span>
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
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
