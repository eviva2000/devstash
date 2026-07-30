import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { UpgradePlans } from "@/components/billing/upgrade-plans";
import { getUserBillingAccess } from "@/lib/billing/entitlements";

export const metadata: Metadata = {
  title: "Upgrade to DevStash Pro",
  description: "Choose a DevStash Pro plan.",
};

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/upgrade");
  }

  const billingAccess = await getUserBillingAccess(session.user.id);

  if (billingAccess.hasActivePro) {
    redirect("/profile");
  }

  return <UpgradePlans />;
}
