import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Folder,
  Layers3,
  Link as LinkIcon,
} from "lucide-react";
import type { ComponentType } from "react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { ProfileAccountActions } from "@/components/profile/profile-account-actions";
import { ProfileBillingCard } from "@/components/profile/profile-billing-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getTypeColorStyle } from "@/features/dashboard/dashboard-utils";
import { getIconComponent } from "@/lib/icon-map";
import { getProfileOverview } from "@/lib/db/profile";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type SearchParams = Promise<{
  checkout?: string | string[];
  interval?: string | string[];
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

  const profile = await getProfileOverview(session.user.id);

  if (!profile) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const name = profile.user.name ?? profile.user.email ?? "DevStash user";
  const primaryProvider = profile.user.providers[0];

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Profile</p>
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-md border border-border bg-card p-5 text-card-foreground">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <UserAvatar
                className="size-20 rounded-lg text-xl"
                image={profile.user.image}
                name={name}
              />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold tracking-normal">
                    {name}
                  </h2>
                  {profile.user.email && (
                    <p className="truncate text-sm text-muted-foreground">
                      {profile.user.email}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <CalendarDays data-icon="inline-start" />
                    Joined {dateFormatter.format(profile.user.createdAt)}
                  </Badge>
                  <Badge variant="outline">
                    {primaryProvider === "github" ? "GitHub" : "Email"} account
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <ProfileStat
              detail="Saved developer resources"
              icon={Layers3}
              iconClassName="bg-blue-500/15 text-blue-400"
              label="Items"
              value={profile.stats.totalItems}
            />
            <ProfileStat
              detail="Organized groups"
              icon={Folder}
              iconClassName="bg-emerald-500/15 text-emerald-400"
              label="Collections"
              value={profile.stats.totalCollections}
            />
            <ProfileStat
              detail="Available categories"
              icon={FileText}
              iconClassName="bg-amber-500/15 text-amber-400"
              label="Types"
              value={profile.stats.totalTypes}
            />
          </div>
        </section>

        <ProfileBillingCard
          billing={profile.billing}
          checkoutState={getParam(params.checkout)}
          initialInterval={
            getParam(params.interval) === "monthly" ? "monthly" : "yearly"
          }
          sessionId={getParam(params.session_id)}
        />

        <section className="rounded-md border border-border bg-card p-5 text-card-foreground">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-base font-semibold tracking-normal">
              Item type breakdown
            </h2>
            <p className="text-sm text-muted-foreground">
              Counts across your snippets, prompts, notes, commands, links,
              files, and images.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {profile.itemTypes.map((type) => {
              const Icon = getIconComponent(type.icon) ?? LinkIcon;

              return (
                <div
                  className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
                  key={type.id}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    style={getTypeColorStyle(type.color)}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{type.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {type.count} {type.count === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <ProfileAccountActions
          canChangePassword={profile.user.canChangePassword}
        />
      </div>
    </main>
  );
}

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function ProfileStat({
  detail,
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  detail: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            iconClassName
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
