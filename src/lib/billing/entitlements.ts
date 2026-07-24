import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getUsageLimits,
  type UserEntitlements,
} from "@/lib/usage-limits";

export type ActiveProAccessErrorCode =
  | "PRO_REQUIRED"
  | "BILLING_PAST_DUE";

export class ActiveProRequiredError extends Error {
  readonly code: ActiveProAccessErrorCode;

  constructor(code: ActiveProAccessErrorCode) {
    super(
      code === "BILLING_PAST_DUE"
        ? "An active subscription is required because billing is past due."
        : "An active Pro subscription is required."
    );
    this.name = "ActiveProRequiredError";
    this.code = code;
  }
}

async function getEntitlementSnapshot(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscriptionStatus: true,
    },
  });

  return {
    subscriptionStatus: user?.subscriptionStatus ?? null,
    entitlements: getUsageLimits(user),
  };
}

export async function getUserEntitlements(
  userId: string
): Promise<UserEntitlements> {
  const snapshot = await getEntitlementSnapshot(userId);
  return snapshot.entitlements;
}

export async function requireActiveProUser(
  userId: string
): Promise<UserEntitlements> {
  const snapshot = await getEntitlementSnapshot(userId);

  if (!snapshot.entitlements.hasActivePro) {
    throw new ActiveProRequiredError(
      snapshot.subscriptionStatus === "PAST_DUE"
        ? "BILLING_PAST_DUE"
        : "PRO_REQUIRED"
    );
  }

  return snapshot.entitlements;
}
