import { CollectionDetailShell } from "@/components/collections/collection-detail-shell";

// Always render on each request so Prisma queries reflect current DB state.
export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CollectionDetailShell collectionId={id} />;
}
