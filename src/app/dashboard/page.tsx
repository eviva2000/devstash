import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// Always render on each request so Prisma queries reflect current DB state.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <DashboardShell />;
}
