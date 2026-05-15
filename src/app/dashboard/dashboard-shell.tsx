"use client";

import { useMemo, useState } from "react";

import { getDashboardData } from "@/features/dashboard/dashboard-data";

import { DashboardHeader } from "./components/dashboard-header";
import { DashboardMain } from "./components/dashboard-main";
import {
  DesktopSidebar,
  MobileDrawer,
} from "./components/dashboard-sidebar";

export function DashboardShell() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { dashboardData, sidebarData } = useMemo(() => getDashboardData(), []);

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
        <DashboardHeader
          isMobileDrawerOpen={isMobileDrawerOpen}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        />
        <DashboardMain data={dashboardData} />
      </section>
    </main>
  );
}
