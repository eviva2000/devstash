"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
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
  return (
    <DashboardAppShell
      renderHeader={({ isMobileDrawerOpen, openMobileDrawer }) => (
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border bg-background px-4 pt-4 md:hidden">
          <Button
            aria-expanded={isMobileDrawerOpen}
            aria-label="Open sidebar"
            onClick={openMobileDrawer}
            size="icon"
            type="button"
            variant="outline"
          >
            <Menu />
          </Button>
          <span className="text-sm font-medium">Profile</span>
        </div>
      )}
      sidebarData={sidebarData}
      user={user}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </DashboardAppShell>
  );
}
