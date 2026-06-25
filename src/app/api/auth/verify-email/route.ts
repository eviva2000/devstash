import { NextResponse } from "next/server";

import {
  getSafeCallbackUrl,
  normalizeEmail,
  verifyEmailToken,
} from "@/lib/auth/email-verification";

function getRedirectUrl(request: Request, status: string, callbackUrl: string) {
  if (status === "verified") {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", callbackUrl);
    signInUrl.searchParams.set("verified", "1");

    return signInUrl;
  }

  const verifyEmailUrl = new URL("/verify-email", request.url);
  verifyEmailUrl.searchParams.set("status", status);
  verifyEmailUrl.searchParams.set("callbackUrl", callbackUrl);

  return verifyEmailUrl;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email") ?? "");
  const token = url.searchParams.get("token") ?? "";
  const callbackUrl = getSafeCallbackUrl(
    url.searchParams.get("callbackUrl") ?? ""
  );

  if (!email || !token) {
    return NextResponse.redirect(
      getRedirectUrl(request, "invalid", callbackUrl)
    );
  }

  const status = await verifyEmailToken({ email, token });

  return NextResponse.redirect(getRedirectUrl(request, status, callbackUrl));
}
