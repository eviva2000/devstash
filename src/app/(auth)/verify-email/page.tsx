import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import {
  getSafeCallbackUrl,
  isEmailVerificationEnabled,
} from "@/lib/auth/email-verification";

type SearchParams = Promise<{
  callbackUrl?: string | string[];
  email?: string | string[];
  sent?: string | string[];
  status?: string | string[];
}>;

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getStatusCopy(status?: string, sent?: string) {
  if (sent === "1") {
    return {
      body: "We sent a verification link to your email address.",
      title: "Check your email",
    };
  }

  if (sent === "0") {
    return {
      body:
        "Your account was created, but the verification email could not be sent.",
      title: "Send verification email",
    };
  }

  if (status === "expired") {
    return {
      body: "That verification link has expired.",
      title: "Verification link expired",
    };
  }

  if (status === "invalid") {
    return {
      body: "That verification link is invalid or has already been used.",
      title: "Verification link invalid",
    };
  }

  return {
    body: "Enter your email address and we will send a new verification link.",
    title: "Verify your email",
  };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(getParam(params.callbackUrl));

  if (!isEmailVerificationEnabled()) {
    const signInParams = new URLSearchParams({
      callbackUrl,
      registered: "1",
    });

    redirect(`/sign-in?${signInParams.toString()}`);
  }

  if (session?.user) {
    redirect(callbackUrl);
  }

  const statusCopy = getStatusCopy(
    getParam(params.status),
    getParam(params.sent)
  );
  const initialEmail = getParam(params.email) ?? "";

  return (
    <AuthPageShell subtitle={statusCopy.body} title={statusCopy.title}>
      <div className="space-y-5">
        <ResendVerificationForm
          callbackUrl={callbackUrl}
          initialEmail={initialEmail}
        />
        <p className="text-center text-sm text-muted-foreground">
          Ready to sign in?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Go to sign in
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
