import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_EMAIL = "demo@devstash.io";
const shouldDelete = process.argv.includes("--confirm");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before deleting users.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function formatCount(label: string, count: number) {
  return `${label}: ${count}`;
}

async function main() {
  const usersToDelete = await prisma.user.findMany({
    where: {
      OR: [{ email: null }, { email: { not: DEMO_EMAIL } }],
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      email: true,
      id: true,
    },
  });

  const userIds = usersToDelete.map((user) => user.id);

  const [
    accountCount,
    sessionCount,
    itemCount,
    collectionCount,
    tagCount,
    itemTypeCount,
    verificationTokenCount,
  ] = await Promise.all([
    prisma.account.count({ where: { userId: { in: userIds } } }),
    prisma.session.count({ where: { userId: { in: userIds } } }),
    prisma.item.count({ where: { userId: { in: userIds } } }),
    prisma.collection.count({ where: { userId: { in: userIds } } }),
    prisma.tag.count({ where: { userId: { in: userIds } } }),
    prisma.itemType.count({ where: { userId: { in: userIds } } }),
    prisma.verificationToken.count({
      where: { identifier: { not: DEMO_EMAIL } },
    }),
  ]);

  console.log(`Keeping ${DEMO_EMAIL} and all content owned by that user.`);
  console.log(`Users selected for deletion: ${usersToDelete.length}`);

  if (usersToDelete.length > 0) {
    console.log(
      usersToDelete
        .map((user) => `- ${user.email ?? "(no email)"} (${user.id})`)
        .join("\n")
    );
  }

  console.log("\nRows that will be deleted:");
  console.log(formatCount("accounts", accountCount));
  console.log(formatCount("sessions", sessionCount));
  console.log(formatCount("items", itemCount));
  console.log(formatCount("collections", collectionCount));
  console.log(formatCount("tags", tagCount));
  console.log(formatCount("user-owned item types", itemTypeCount));
  console.log(formatCount("verification tokens", verificationTokenCount));
  console.log(formatCount("users", usersToDelete.length));

  if (!shouldDelete) {
    console.log("\nDry run only. Re-run with --confirm to delete these rows.");
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedVerificationTokens = await tx.verificationToken.deleteMany({
      where: { identifier: { not: DEMO_EMAIL } },
    });

    if (userIds.length === 0) {
      return {
        deletedAccounts: { count: 0 },
        deletedCollections: { count: 0 },
        deletedItemTypes: { count: 0 },
        deletedItems: { count: 0 },
        deletedSessions: { count: 0 },
        deletedTags: { count: 0 },
        deletedUsers: { count: 0 },
        deletedVerificationTokens,
      };
    }

    const deletedItems = await tx.item.deleteMany({
      where: { userId: { in: userIds } },
    });
    const deletedCollections = await tx.collection.deleteMany({
      where: { userId: { in: userIds } },
    });
    const deletedTags = await tx.tag.deleteMany({
      where: { userId: { in: userIds } },
    });
    const deletedItemTypes = await tx.itemType.deleteMany({
      where: { userId: { in: userIds } },
    });
    const deletedAccounts = await tx.account.deleteMany({
      where: { userId: { in: userIds } },
    });
    const deletedSessions = await tx.session.deleteMany({
      where: { userId: { in: userIds } },
    });
    const deletedUsers = await tx.user.deleteMany({
      where: { id: { in: userIds } },
    });

    return {
      deletedAccounts,
      deletedCollections,
      deletedItemTypes,
      deletedItems,
      deletedSessions,
      deletedTags,
      deletedUsers,
      deletedVerificationTokens,
    };
  });

  console.log("\nDeleted rows:");
  console.log(formatCount("accounts", result.deletedAccounts.count));
  console.log(formatCount("sessions", result.deletedSessions.count));
  console.log(formatCount("items", result.deletedItems.count));
  console.log(formatCount("collections", result.deletedCollections.count));
  console.log(formatCount("tags", result.deletedTags.count));
  console.log(formatCount("user-owned item types", result.deletedItemTypes.count));
  console.log(
    formatCount("verification tokens", result.deletedVerificationTokens.count)
  );
  console.log(formatCount("users", result.deletedUsers.count));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
