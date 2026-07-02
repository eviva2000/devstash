import { ItemListShell } from "@/components/items/item-list-shell";

// Always render on each request so Prisma queries reflect current DB state.
export const dynamic = "force-dynamic";

export default async function ItemTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  return <ItemListShell typeSlug={type} />;
}
