import { describe, expect, test } from "vitest";

import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  getUsageLimits,
} from "./usage-limits";

describe("getUsageLimits", () => {
  test("keeps the documented Free limits", () => {
    expect(FREE_ITEM_LIMIT).toBe(50);
    expect(FREE_COLLECTION_LIMIT).toBe(3);
  });

  test("grants unlimited paid entitlements only to active Pro users", () => {
    expect(
      getUsageLimits({ plan: "PRO", subscriptionStatus: "ACTIVE" })
    ).toEqual({
      hasActivePro: true,
      canUseAi: true,
      canUploadDocuments: true,
      canManageCustomTypes: true,
      canExport: true,
      itemLimit: null,
      collectionLimit: null,
    });
  });

  test.each([
    ["FREE", "INACTIVE"],
    ["FREE", "ACTIVE"],
    ["PRO", "PAST_DUE"],
    ["PRO", "CANCELED"],
    ["PRO", "INACTIVE"],
    ["PRO", "TRIALING"],
    ["ENTERPRISE", "ACTIVE"],
  ])(
    "fails closed for plan %s with status %s",
    (plan, subscriptionStatus) => {
      expect(getUsageLimits({ plan, subscriptionStatus })).toEqual({
        hasActivePro: false,
        canUseAi: false,
        canUploadDocuments: false,
        canManageCustomTypes: false,
        canExport: false,
        itemLimit: 50,
        collectionLimit: 3,
      });
    }
  );

  test.each([undefined, null, {}])(
    "fails closed when billing state is missing",
    (state) => {
      const entitlements = getUsageLimits(state);

      expect(entitlements.hasActivePro).toBe(false);
      expect(entitlements.itemLimit).toBe(FREE_ITEM_LIMIT);
      expect(entitlements.collectionLimit).toBe(FREE_COLLECTION_LIMIT);
      expect(entitlements.itemLimit).not.toBe(Infinity);
      expect(entitlements.collectionLimit).not.toBe(Infinity);
    }
  );
});
