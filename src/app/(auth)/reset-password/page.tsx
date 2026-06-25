import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  getSafeCallbackUrl,
  normalizeEmail,
} from "@/lib/auth/email-verification";

type SearchParams = Promise<{
  callbackUrl?: string | string[];
  email?: string | string[];
  token?: string | string[];
}>;

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(getParam(params.callbackUrl));
  const email = normalizeEmail(getParam(params.email) ?? "");
  const token = getParam(params.token) ?? "";

  return (
    <AuthPageShell
      subtitle="Choose a new password for your DevStash account."
      title="Reset password"
    >
      <ResetPasswordForm
        callbackUrl={callbackUrl}
        email={email}
        token={token}
      />
    </AuthPageShell>
  );
}
