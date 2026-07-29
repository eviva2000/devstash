"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  DesktopSidebar,
  MobileDrawer,
} from "@/components/dashboard/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import type {
  DashboardUser,
  SidebarData,
} from "@/features/dashboard/dashboard-types";

export function ProfileShell({
  children,
  sidebarData,
  user,
}: {
  children: ReactNode;
  sidebarData: SidebarData;
  user: DashboardUser;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
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
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border bg-background px-4 pt-4 md:hidden">
          <Button
            aria-expanded={isMobileDrawerOpen}
            aria-label="Open sidebar"
            onClick={() => setIsMobileDrawerOpen(true)}
            size="icon"
            type="button"
            variant="outline"
          >
            <Menu />
          </Button>
          <span className="text-sm font-medium">Profile</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}
