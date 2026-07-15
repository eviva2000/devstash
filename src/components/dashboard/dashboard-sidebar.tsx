"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  Folder,
  Layers3,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Star,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/homepage/logo-mark";
import { UserAvatar } from "@/components/user-avatar";
import type {
  DashboardUser,
  SidebarData,
} from "@/features/dashboard/dashboard-types";
import {
  getTypeColorStyle,
  getTypeMarkerStyle,
  typeColorMap,
  typeIconMap,
} from "@/features/dashboard/dashboard-utils";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const proBadgeItemTypeSlugs = new Set(["file", "image"]);

export function DesktopSidebar({
  data,
  isCollapsed,
  onToggle,
  user,
}: Readonly<{
  data: SidebarData;
  isCollapsed: boolean;
  onToggle: () => void;
  user: DashboardUser;
}>) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex md:flex-col",
        isCollapsed ? "w-24" : "w-64"
      )}
    >
      <SidebarContent
        data={data}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        user={user}
      />
    </aside>
  );
}

export function MobileDrawer({
  data,
  isOpen,
  onClose,
  user,
}: {
  data: SidebarData;
  isOpen: boolean;
  onClose: () => void;
  user: DashboardUser;
}) {
  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <button
        aria-label="Close sidebar"
        className={cn(
          "absolute inset-0 bg-background/70 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "relative flex h-full w-72 max-w-[86vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent data={data} isMobile onClose={onClose} user={user} />
      </aside>
    </div>
  );
}

function SidebarContent({
  data,
  isCollapsed = false,
  isMobile = false,
  onClose,
  onToggle,
  user,
}: Readonly<{
  data: SidebarData;
  isCollapsed?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  user: DashboardUser;
}>) {
  const compact = isCollapsed && !isMobile;
  const [areCollectionsOpen, setAreCollectionsOpen] = useState(true);

  return (
    <>
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-4",
          compact ? "justify-center gap-3 px-2" : "gap-3"
        )}
      >
        <Link
          aria-label="DevStash home"
          className={cn(
            "flex min-w-0 items-center gap-3",
            compact && "justify-center"
          )}
          href="/"
          onClick={onClose}
        >
          <LogoMark className="size-9 shrink-0" />
          {!compact && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                DevStash
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Developer Hub
              </span>
            </span>
          )}
        </Link>

        <Button
          aria-label={
            isMobile ? "Close sidebar" : compact ? "Open sidebar" : "Close sidebar"
          }
          className={cn(!compact && "ml-auto")}
          onClick={isMobile ? onClose : onToggle}
          size="icon"
          type="button"
          variant="outline"
        >
          {isMobile || !compact ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4">
        <div className="space-y-1">
          <SidebarLink
            count={data.totalItemsCount}
            href="/dashboard"
            icon={Layers3}
            isCollapsed={compact}
            label="Dashboard"
            onClick={onClose}
          />
        </div>

        <SidebarSection isCollapsed={compact} title="Types">
          {data.types.map((type) => {
            const Icon =
              typeIconMap[type.icon as keyof typeof typeIconMap] ?? FileText;
            const colorClass =
              typeColorMap[type.color as keyof typeof typeColorMap] ??
              typeColorMap.zinc;

            return (
              <SidebarLink
                badge={proBadgeItemTypeSlugs.has(type.slug) ? "PRO" : undefined}
                count={type.count}
                href={type.href}
                icon={Icon}
                iconClassName={colorClass}
                iconStyle={getTypeColorStyle(type.color)}
                isCollapsed={compact}
                key={type.id}
                label={type.name}
                onClick={onClose}
              />
            );
          })}
        </SidebarSection>

        <CollapsibleSidebarSection
          isCollapsed={compact}
          isOpen={areCollectionsOpen}
          onToggle={() => setAreCollectionsOpen((value) => !value)}
          title="Collections"
        >
          <CollectionGroupLabel isCollapsed={compact}>
            Favorites
          </CollectionGroupLabel>
          {data.favoriteCollections.map((collection) => (
            <SidebarLink
              count={collection.itemCount}
              href={`/collections/${collection.id}`}
              icon={Star}
              iconClassName="bg-amber-500/15 text-amber-400"
              isCollapsed={compact}
              key={collection.id}
              label={collection.name}
              onClick={onClose}
            />
          ))}

          <CollectionGroupLabel isCollapsed={compact}>
            Recent
          </CollectionGroupLabel>
          {data.recentCollections.map((collection) => (
            <SidebarLink
              count={collection.itemCount}
              href={`/collections/${collection.id}`}
              marker
              markerStyle={getTypeMarkerStyle(
                collection.dominantType?.color
              )}
              isCollapsed={compact}
              key={collection.id}
              label={collection.name}
              onClick={onClose}
            />
          ))}
          <SidebarLink
            href="/collections"
            icon={Folder}
            isCollapsed={compact}
            label="View all collections"
            onClick={onClose}
          />
        </CollapsibleSidebarSection>
      </nav>

      <SidebarUserMenu
        isCollapsed={compact}
        onNavigate={onClose}
        user={user}
      />
    </>
  );
}

function SidebarUserMenu({
  isCollapsed,
  onNavigate,
  user,
}: {
  isCollapsed: boolean;
  onNavigate?: () => void;
  user: DashboardUser;
}) {
  const [isOpen, setIsOpen] = useState(false);

  async function handleSignOut() {
    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <div className="relative shrink-0 border-t border-sidebar-border p-3">
      {isOpen && (
        <div
          className={cn(
            "absolute bottom-[calc(100%-0.5rem)] z-10 rounded-lg border border-sidebar-border bg-popover p-1 text-popover-foreground shadow-xl",
            isCollapsed ? "left-3 w-44" : "left-3 right-3"
          )}
        >
          <Link
            className="flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            href="/profile"
            onClick={() => {
              setIsOpen(false);
              onNavigate?.();
            }}
          >
            <Settings className="size-4" />
            <span className="min-w-0 truncate">Profile</span>
          </Link>
          <button
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="size-4" />
            <span className="min-w-0 truncate">Sign out</span>
          </button>
        </div>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-2",
          isCollapsed ? "justify-center" : "hover:bg-sidebar-accent"
        )}
      >
        <button
          aria-expanded={isOpen}
          aria-label="Account menu"
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
            isCollapsed ? "justify-center" : "flex-1"
          )}
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          <UserAvatar image={user.image} name={user.name} />
          {!isCollapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {user.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email ?? "Signed in"}
              </span>
            </span>
          )}
        </button>
        {!isCollapsed && (
          <Link
            aria-label="Open profile"
            className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
            href="/profile"
            onClick={onNavigate}
            title="Open profile"
          >
            <Settings className="size-[18px]" />
          </Link>
        )}
      </div>
    </div>
  );
}

function SidebarSection({
  children,
  isCollapsed,
  title,
}: Readonly<{
  children: ReactNode;
  isCollapsed: boolean;
  title: string;
}>) {
  return (
    <div className="mt-5 border-t border-sidebar-border pt-4">
      {!isCollapsed && (
        <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CollapsibleSidebarSection({
  children,
  isCollapsed,
  isOpen,
  onToggle,
  title,
}: {
  children: ReactNode;
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  if (isCollapsed) {
    return (
      <div className="mt-5 border-t border-sidebar-border pt-4">
        <div className="space-y-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-sidebar-border pt-4">
      <button
        aria-expanded={isOpen}
        className="mb-2 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={onToggle}
        type="button"
      >
        <Folder className="size-[18px]" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function CollectionGroupLabel({
  children,
  isCollapsed,
}: {
  children: ReactNode;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return null;
  }

  return (
    <p className="px-2 pb-1 pt-2 text-[0.7rem] font-medium text-muted-foreground">
      {children}
    </p>
  );
}

function SidebarLink({
  count,
  href,
  icon: Icon,
  iconClassName,
  iconStyle,
  isCollapsed,
  label,
  badge,
  marker,
  markerStyle,
  onClick,
}: {
  readonly badge?: string;
  readonly count?: number;
  readonly href: string;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly iconClassName?: string;
  readonly iconStyle?: CSSProperties;
  readonly isCollapsed: boolean;
  readonly label: string;
  readonly marker?: boolean;
  readonly markerStyle?: CSSProperties;
  readonly onClick?: () => void;
}) {
  const hasMarker = marker || Boolean(markerStyle);

  return (
    <Link
      className={cn(
        "flex h-9 items-center rounded-lg text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isCollapsed ? "justify-center px-0" : "gap-2 px-2"
      )}
      href={href}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          iconClassName
        )}
        style={iconStyle}
      >
        {hasMarker ? (
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-current"
            style={markerStyle}
          />
        ) : (
          Icon && <Icon className="size-4" />
        )}
      </span>
      {!isCollapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge && (
            <Badge
              className="h-4 border-sidebar-border bg-sidebar-accent/70 px-1.5 text-[0.625rem] font-semibold tracking-normal text-muted-foreground"
              variant="outline"
            >
              {badge}
            </Badge>
          )}
          {typeof count === "number" && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {count}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
