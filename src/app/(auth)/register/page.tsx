import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RegisterForm } from "@/components/auth/register-form";

type SearchParams = Promise<{
  callbackUrl?: string | string[];
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

export default async function RegisterPage({
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
    <AuthPageShell subtitle="Create a DevStash account." title="Register">
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthPageShell>
  );
}
