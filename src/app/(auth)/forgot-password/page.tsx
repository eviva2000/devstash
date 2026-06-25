import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getSafeCallbackUrl } from "@/lib/auth/email-verification";

type SearchParams = Promise<{
  callbackUrl?: string | string[];
}>;

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(getParam(params.callbackUrl));

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <AuthPageShell
      subtitle="Enter your email and we will send a reset link if the account exists."
      title="Forgot password"
    >
      <ForgotPasswordForm callbackUrl={callbackUrl} />
    </AuthPageShell>
  );
}
