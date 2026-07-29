import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/user-avatar";
import { ProfileAccountActions } from "@/components/profile/profile-account-actions";
import { ProfileBillingCard } from "@/components/profile/profile-billing-card";
import { ProfileShell } from "@/components/profile/profile-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  getFavoriteCollections,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import { getItemTypeCounts } from "@/lib/db/items";
import { getProfileOverview } from "@/lib/db/profile";
import { getTypeHref } from "@/features/dashboard/dashboard-utils";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type SearchParams = Promise<{
  checkout?: string | string[];
  interval?: string | string[];
  portal?: string | string[];
  session_id?: string | string[];
}>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const [
    profile,
    favoriteCollections,
    recentCollections,
    itemTypes,
    itemTypeCounts,
  ] = await Promise.all([
    getProfileOverview(session.user.id),
    getFavoriteCollections(session.user.id),
    getRecentCollections(session.user.id, 3),
    getItemTypes(),
    getItemTypeCounts(session.user.id),
  ]);

  if (!profile) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const name = profile.user.name ?? profile.user.email ?? "DevStash user";
  const primaryProvider = profile.user.providers[0];
  const sidebarData = {
    totalItemsCount: profile.billing.itemUsage.used,
    favoriteItemsCount: 0,
    pinnedItemsCount: 0,
    recentItemsCount: 0,
    types: itemTypes.map((type) => ({
      ...type,
      count: itemTypeCounts[type.id] ?? 0,
      href: getTypeHref(type.slug),
    })),
    favoriteCollections,
    recentCollections,
  };

  return (
    <ProfileShell
      sidebarData={sidebarData}
      user={{
        name,
        email: profile.user.email,
        image: profile.user.image,
      }}
    >
      <main className="min-h-full bg-background px-4 pb-6 pt-10 text-foreground md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
          <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                className="size-12 shrink-0 rounded-md text-base"
                image={profile.user.image}
                name={name}
              />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Profile</p>
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {profile.user.email && profile.user.email !== name && (
                    <span>{profile.user.email}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    Joined {dateFormatter.format(profile.user.createdAt)}
                  </span>
                  <span>
                    {primaryProvider === "github" ? "GitHub" : "Email"} account
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/dashboard"
              >
                Back to dashboard
              </Link>
            </div>
          </header>

          <ProfileBillingCard
            billing={profile.billing}
            checkoutState={getParam(params.checkout)}
            initialInterval={
              getParam(params.interval) === "monthly" ? "monthly" : "yearly"
            }
            portalState={getParam(params.portal)}
            sessionId={getParam(params.session_id)}
          />

          <ProfileAccountActions
            canChangePassword={profile.user.canChangePassword}
          />
        </div>
      </main>
    </ProfileShell>
  );
}

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
