import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

type SearchParams = Promise<{
  code?: string | string[];
  callbackUrl?: string | string[];
  error?: string | string[];
  registered?: string | string[];
  verified?: string | string[];
}>;

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeCallbackUrl(value?: string) {
  if (!value || value.startsWith("//")) {
    return "/dashboard";
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export default async function SignInPage({
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
      subtitle="Use your DevStash account or GitHub."
      title="Sign in"
    >
      <SignInForm
        callbackUrl={callbackUrl}
        initialCode={getParam(params.code)}
        initialError={getParam(params.error)}
        registered={getParam(params.registered) === "1"}
        verified={getParam(params.verified) === "1"}
      />
    </AuthPageShell>
  );
}
