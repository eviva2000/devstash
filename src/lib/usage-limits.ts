export const FREE_ITEM_LIMIT = 50;
export const FREE_COLLECTION_LIMIT = 3;

export interface BillingAccessState {
  plan?: string | null;
  subscriptionStatus?: string | null;
}

export interface UserEntitlements {
  hasActivePro: boolean;
  canUseAi: boolean;
  canUploadDocuments: boolean;
  canManageCustomTypes: boolean;
  canExport: boolean;
  itemLimit: number | null;
  collectionLimit: number | null;
}

export function getUsageLimits(
  state?: BillingAccessState | null
): UserEntitlements {
  const hasActivePro =
    state?.plan === "PRO" && state.subscriptionStatus === "ACTIVE";

  return {
    hasActivePro,
    canUseAi: hasActivePro,
    canUploadDocuments: hasActivePro,
    canManageCustomTypes: hasActivePro,
    canExport: hasActivePro,
    itemLimit: hasActivePro ? null : FREE_ITEM_LIMIT,
    collectionLimit: hasActivePro ? null : FREE_COLLECTION_LIMIT,
  };
}
