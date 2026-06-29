"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function getAuthErrorMessage(error?: string, code?: string) {
  if (!error) {
    return "";
  }

  if (error === "CredentialsSignin" && code === "email_unverified") {
    return "Verify your email before signing in.";
  }

  if (error === "CredentialsSignin" && code === "rate_limited") {
    return "Too many sign-in attempts. Please try again later.";
  }

  if (error === "CredentialsSignin") {
    return "Email or password is incorrect.";
  }

  return "Unable to sign in. Try again.";
}

export function SignInForm({
  callbackUrl,
  initialCode,
  initialError,
  registered,
  reset,
  verified,
}: {
  callbackUrl: string;
  initialCode?: string;
  initialError?: string;
  registered: boolean;
  reset: boolean;
  verified: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() =>
    getAuthErrorMessage(initialError, initialCode)
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isPending, setIsPending] = useState(false);

  const registerHref = useMemo(
    () => `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    [callbackUrl]
  );
  const forgotPasswordHref = useMemo(
    () => `/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    [callbackUrl]
  );

  const handleCredentialsSubmit: React.ComponentProps<"form">["onSubmit"] =
    async (event) => {
      event.preventDefault();
      setError("");
      setUnverifiedEmail("");

      const normalizedEmail = email.trim().toLowerCase();

      if (!emailPattern.test(normalizedEmail)) {
        setError("Enter a valid email address.");
        return;
      }

      if (!password) {
        setError("Enter your password.");
        return;
      }

      setIsPending(true);
      const result = await signIn("credentials", {
        callbackUrl,
        email: normalizedEmail,
        password,
        redirect: false,
      });
      setIsPending(false);

      if (result?.error) {
        setError(getAuthErrorMessage(result.error, result.code));
        if (result.code === "email_unverified") {
          setUnverifiedEmail(normalizedEmail);
        }
        return;
      }

      router.push(result?.url ?? callbackUrl);
      router.refresh();
    };

  return (
    <div className="space-y-5">
      {registered && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Account created. Sign in to continue.
        </p>
      )}
      {verified && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Email verified. Sign in to continue.
        </p>
      )}
      {reset && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Password reset. Sign in with your new password.
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
      {unverifiedEmail && (
        <ResendVerificationForm
          callbackUrl={callbackUrl}
          initialEmail={unverifiedEmail}
        />
      )}

      <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
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
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Link
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              href={forgotPasswordHref}
            >
              Forgot password?
            </Link>
          </div>
          <Input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <Button className="w-full" disabled={isPending} size="lg" type="submit">
          <span>{isPending ? "Signing in" : "Sign in"}</span>
          <ArrowRight data-icon="inline-end" />
        </Button>
      </form>

      <div className="grid gap-3">
        <Button
          className="w-full"
          onClick={() => signIn("github", { callbackUrl })}
          size="lg"
          type="button"
          variant="outline"
        >
          <GitHubIcon />
          <span>Sign in with GitHub</span>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href={registerHref}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
