import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before testing the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const [databaseInfo] = await prisma.$queryRaw<
    Array<{ database: string; schema: string; serverTime: Date }>
  >`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      now() AS "serverTime"
  `;

  const [userCount, itemTypeCount, collectionCount, itemCount, tagCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.itemType.count(),
      prisma.collection.count(),
      prisma.item.count(),
      prisma.tag.count(),
    ]);

  console.log("Database connection OK");
  console.log(
    JSON.stringify(
      {
        database: databaseInfo.database,
        schema: databaseInfo.schema,
        serverTime: databaseInfo.serverTime,
        counts: {
          users: userCount,
          itemTypes: itemTypeCount,
          collections: collectionCount,
          items: itemCount,
          tags: tagCount,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Database test failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
