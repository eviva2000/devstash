"use client";

import Link from "next/link";
import {
  ChevronDown,
  Clock,
  Code2,
  File,
  FileText,
  Folder,
  Image,
  Layers3,
  Link as LinkIcon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Terminal,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  mockCollections,
  mockItems,
  mockItemTypes,
  mockUser,
} from "@/lib/mock-data";

const typeIconMap = {
  Code2,
  Sparkles,
  FileText,
  Terminal,
  File,
  Image,
  Link: LinkIcon,
};

const typeColorMap = {
  blue: "bg-blue-500/15 text-blue-400",
  purple: "bg-purple-500/15 text-purple-400",
  zinc: "bg-zinc-500/20 text-zinc-300",
  green: "bg-emerald-500/15 text-emerald-400",
  orange: "bg-orange-500/15 text-orange-400",
  pink: "bg-pink-500/15 text-pink-400",
  cyan: "bg-cyan-500/15 text-cyan-400",
};

const pluralTypeSlugs: Record<string, string> = {
  url: "urls",
};

function getTypeHref(slug: string) {
  return `/items/${pluralTypeSlugs[slug] ?? `${slug}s`}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardShell() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const sidebarData = useMemo(() => {
    const typeCounts = new Map<string, number>();

    for (const item of mockItems) {
      typeCounts.set(item.typeId, (typeCounts.get(item.typeId) ?? 0) + 1);
    }

    return {
      favoriteItemsCount: mockItems.filter((item) => item.isFavorite).length,
      pinnedItemsCount: mockItems.filter((item) => item.isPinned).length,
      recentItemsCount: Math.min(mockItems.length, 5),
      types: mockItemTypes.map((type) => ({
        ...type,
        count: typeCounts.get(type.id) ?? 0,
        href: getTypeHref(type.slug),
      })),
      favoriteCollections: mockCollections.filter(
        (collection) => collection.isFavorite
      ),
      recentCollections: mockCollections.slice(0, 3),
    };
  }, []);

  return (
    <main className="flex min-h-screen overflow-hidden bg-background text-foreground">
      <DesktopSidebar
        data={sidebarData}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
      />

      <MobileDrawer
        data={sidebarData}
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
          <Button
            aria-expanded={isMobileDrawerOpen}
            aria-label="Open sidebar"
            className="md:hidden"
            onClick={() => setIsMobileDrawerOpen(true)}
            size="icon"
            type="button"
            variant="outline"
          >
            <Menu />
          </Button>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search items"
              className="pl-8"
              placeholder="Search items..."
              type="search"
            />
          </div>

          <Button className="ml-auto" type="button">
            <Plus data-icon="inline-start" />
            New Item
          </Button>
        </header>

        <div className="flex flex-1 bg-background px-4 py-6 md:px-6">
          <h2 className="text-2xl font-semibold">Main</h2>
        </div>
      </section>
    </main>
  );
}

type SidebarData = {
  favoriteItemsCount: number;
  pinnedItemsCount: number;
  recentItemsCount: number;
  types: Array<(typeof mockItemTypes)[number] & { count: number; href: string }>;
  favoriteCollections: typeof mockCollections;
  recentCollections: typeof mockCollections;
};

function DesktopSidebar({
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

function MobileDrawer({
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
            count={mockItems.length}
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
              icon={Folder}
              isCollapsed={compact}
              key={collection.id}
              label={collection.name}
              onClick={onClose}
            />
          ))}
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  isCollapsed,
  label,
  onClick,
}: {
  count?: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  isCollapsed: boolean;
  label: string;
  onClick?: () => void;
}) {
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
      >
        <Icon className="size-4" />
      </span>
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
