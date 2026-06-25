"use client";

import type React from "react";
import { useState } from "react";
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

  return "Unable to send verification email.";
}

export function ResendVerificationForm({
  callbackUrl,
  initialEmail = "",
}: {
  callbackUrl: string;
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

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
    const response = await fetch("/api/auth/resend-verification", {
      body: JSON.stringify({ callbackUrl, email: normalizedEmail }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsPending(false);

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setMessage("Verification email sent. Check your inbox.");
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="resend-email">
          Email
        </label>
        <Input
          autoComplete="email"
          id="resend-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
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
      <Button className="w-full" disabled={isPending} size="lg" type="submit">
        <Mail data-icon="inline-start" />
        <span>{isPending ? "Sending" : "Resend verification email"}</span>
      </Button>
    </form>
  );
}
