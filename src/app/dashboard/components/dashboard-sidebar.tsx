"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Clock,
  FileText,
  Folder,
  Layers3,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Settings,
  Star,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { SidebarData } from "@/features/dashboard/dashboard-types";
import {
  getInitials,
  getTypeColorStyle,
<<<<<<< HEAD
  getTypeMarkerStyle,
=======
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
  typeColorMap,
  typeIconMap,
} from "@/features/dashboard/dashboard-utils";
import { cn } from "@/lib/utils";
import { mockUser } from "@/lib/mock-data";

export function DesktopSidebar({
  data,
  isCollapsed,
  onToggle,
}: {
  data: SidebarData;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex md:flex-col",
        isCollapsed ? "w-24" : "w-64"
      )}
    >
      <SidebarContent
        data={data}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
      />
    </aside>
  );
}

export function MobileDrawer({
  data,
  isOpen,
  onClose,
}: {
  data: SidebarData;
  isOpen: boolean;
  onClose: () => void;
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
        <SidebarContent data={data} isMobile onClose={onClose} />
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
}: {
  data: SidebarData;
  isCollapsed?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}) {
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
          aria-label="DevStash dashboard"
          className={cn(
            "flex min-w-0 items-center gap-3",
            compact && "justify-center"
          )}
          href="/dashboard"
          onClick={onClose}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers3 className="size-5" />
          </span>
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

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <SidebarLink
            count={data.totalItemsCount}
            href="/dashboard"
            icon={Layers3}
            isCollapsed={compact}
            label="Dashboard"
            onClick={onClose}
          />
          <SidebarLink
            count={data.favoriteItemsCount}
            href="/items/favorites"
            icon={Star}
            isCollapsed={compact}
            label="Favorites"
            onClick={onClose}
          />
          <SidebarLink
            count={data.pinnedItemsCount}
            href="/items/pinned"
            icon={Pin}
            isCollapsed={compact}
            label="Pinned"
            onClick={onClose}
          />
          <SidebarLink
            count={data.recentItemsCount}
            href="/items/recent"
            icon={Clock}
            isCollapsed={compact}
            label="Recent"
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
              href={`/collections/${collection.slug}`}
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
              href={`/collections/${collection.slug}`}
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

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-2 py-2",
            compact ? "justify-center" : "hover:bg-sidebar-accent"
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-xs font-semibold text-white">
            {getInitials(mockUser.name)}
          </span>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{mockUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {mockUser.plan} Plan
                </p>
              </div>
              <Button
                aria-label="Account settings"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Settings className="size-[18px]" />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SidebarSection({
  children,
  isCollapsed,
  title,
}: {
  children: ReactNode;
  isCollapsed: boolean;
  title: string;
}) {
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
  marker,
  markerStyle,
  onClick,
}: {
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
<<<<<<< HEAD
      {hasMarker ? (
        <span className="flex size-6 shrink-0 items-center justify-center">
          <span
            className="size-2.5 rounded-full bg-muted-foreground"
            style={markerStyle}
          />
        </span>
      ) : (
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground",
            iconClassName
          )}
          style={iconStyle}
        >
          {Icon && <Icon className="size-4" />}
        </span>
      )}
=======
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          iconClassName
        )}
        style={iconStyle}
      >
        <Icon className="size-4" />
      </span>
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
      {!isCollapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
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
