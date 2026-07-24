import "server-only";

import { getUserEntitlements } from "@/lib/billing/entitlements";

export async function isProUser(userId: string): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId);
  return entitlements.hasActivePro;
}
