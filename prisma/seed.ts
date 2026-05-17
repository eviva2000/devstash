import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SYSTEM_ITEM_TYPES = [
  {
    name: "Snippet",
    slug: "snippet",
    icon: "Code2",
    color: "blue",
    isSystem: true,
  },
  {
    name: "Prompt",
    slug: "prompt",
    icon: "Sparkles",
    color: "purple",
    isSystem: true,
  },
  {
    name: "Note",
    slug: "note",
    icon: "FileText",
    color: "zinc",
    isSystem: true,
  },
  {
    name: "Command",
    slug: "command",
    icon: "Terminal",
    color: "green",
    isSystem: true,
  },
  {
    name: "File",
    slug: "file",
    icon: "File",
    color: "orange",
    isSystem: true,
  },
  {
    name: "Image",
    slug: "image",
    icon: "Image",
    color: "pink",
    isSystem: true,
  },
  {
    name: "URL",
    slug: "url",
    icon: "Link",
    color: "cyan",
    isSystem: true,
  },
] as const;

async function main() {
  for (const itemType of SYSTEM_ITEM_TYPES) {
    const existingItemType = await prisma.itemType.findFirst({
      where: {
        slug: itemType.slug,
        userId: null,
      },
    });

    if (existingItemType) {
      await prisma.itemType.update({
        where: { id: existingItemType.id },
        data: itemType,
      });
      continue;
    }

    await prisma.itemType.create({
      data: itemType,
    });
  }

  const systemItemTypeCount = await prisma.itemType.count({
    where: {
      isSystem: true,
      userId: null,
    },
  });

  console.log(`Seeded ${systemItemTypeCount} system item types.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
