"use client";

import { useState, type ReactNode } from "react";

import type {
  DashboardUser,
  SidebarData,
} from "@/features/dashboard/dashboard-types";

import { DesktopSidebar, MobileDrawer } from "./dashboard-sidebar";

type DashboardAppShellHeaderProps = {
  readonly isMobileDrawerOpen: boolean;
  readonly openMobileDrawer: () => void;
};

export function DashboardAppShell({
  children,
  renderHeader,
  sidebarData,
  user,
}: {
  readonly children: ReactNode;
  readonly renderHeader: (props: DashboardAppShellHeaderProps) => ReactNode;
  readonly sidebarData: SidebarData;
  readonly user: DashboardUser;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <DesktopSidebar
        data={sidebarData}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
        user={user}
      />

      <MobileDrawer
        data={sidebarData}
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        user={user}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        {renderHeader({
          isMobileDrawerOpen,
          openMobileDrawer: () => setIsMobileDrawerOpen(true),
        })}
        {children}
      </section>
    </main>
  );
}
