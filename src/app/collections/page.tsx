import { CollectionsShell } from "@/components/collections/collections-shell";

// Always render on each request so Prisma queries reflect current DB state.
export const dynamic = "force-dynamic";

export default function CollectionsPage() {
  return <CollectionsShell />;
}
