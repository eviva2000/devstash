import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import {
  ItemContentType,
  PrismaClient,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../src/generated/prisma/client";
import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
} from "../src/lib/usage-limits";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before testing the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_USER = {
  email: "demo@devstash.io",
  name: "Demo User",
  password: "12345678",
} as const;

const EXPECTED_SYSTEM_ITEM_TYPES = [
  { slug: "command", name: "command", icon: "Terminal", color: "#f97316" },
  { slug: "file", name: "file", icon: "File", color: "#6b7280" },
  { slug: "image", name: "image", icon: "Image", color: "#ec4899" },
  { slug: "link", name: "link", icon: "Link", color: "#10b981" },
  { slug: "note", name: "note", icon: "StickyNote", color: "#fde047" },
  { slug: "prompt", name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { slug: "snippet", name: "snippet", icon: "Code", color: "#3b82f6" },
] as const;

const EXPECTED_COLLECTION_ITEM_COUNTS = {
  "AI Workflows": 3,
  DevOps: 8,
  "React Patterns": 7,
} as const;

const EXPECTED_ITEMS_BY_TYPE = {
  command: 5,
  link: 6,
  prompt: 3,
  snippet: 4,
} as const;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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

  const systemItemTypes = await prisma.itemType.findMany({
    where: {
      isSystem: true,
      userId: null,
    },
    orderBy: {
      slug: "asc",
    },
    select: {
      name: true,
      slug: true,
      icon: true,
      color: true,
      isSystem: true,
    },
  });

  const demoUser = await prisma.user.findUnique({
    where: {
      email: DEMO_USER.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      passwordHash: true,
      plan: true,
      subscriptionStatus: true,
      collections: {
        orderBy: {
          name: "asc",
        },
        select: {
          name: true,
          slug: true,
          description: true,
          isFavorite: true,
          items: {
            orderBy: {
              title: "asc",
            },
            select: {
              title: true,
              description: true,
              contentType: true,
              content: true,
              language: true,
              url: true,
              isFavorite: true,
              isPinned: true,
              type: {
                select: {
                  slug: true,
                  icon: true,
                  color: true,
                },
              },
            },
          },
        },
      },
      items: {
        select: {
          id: true,
          contentType: true,
          url: true,
          type: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  assertCondition(databaseInfo, "Database metadata query returned no rows.");
  assertCondition(demoUser, `Demo user ${DEMO_USER.email} was not found.`);
  assertCondition(demoUser.name === DEMO_USER.name, "Demo user name mismatch.");
  assertCondition(
    demoUser.emailVerified instanceof Date,
    "Demo user emailVerified must be set."
  );
  assertCondition(
    demoUser.passwordHash,
    "Demo user password hash must be set."
  );
  assertCondition(
    await bcrypt.compare(DEMO_USER.password, demoUser.passwordHash),
    "Demo user password hash does not match the expected password."
  );
  assertCondition(
    demoUser.plan === SubscriptionPlan.FREE,
    "Demo user should be on the FREE plan."
  );
  assertCondition(
    demoUser.subscriptionStatus === SubscriptionStatus.INACTIVE,
    "Demo user subscription should be inactive."
  );

  assertCondition(
    systemItemTypes.length === EXPECTED_SYSTEM_ITEM_TYPES.length,
    `Expected ${EXPECTED_SYSTEM_ITEM_TYPES.length} system item types, found ${systemItemTypes.length}.`
  );

  for (const [index, expectedType] of EXPECTED_SYSTEM_ITEM_TYPES.entries()) {
    const itemType = systemItemTypes[index];

    assertCondition(itemType, `Missing system item type ${expectedType.slug}.`);
    assertCondition(
      itemType.slug === expectedType.slug &&
        itemType.name === expectedType.name &&
        itemType.icon === expectedType.icon &&
        itemType.color === expectedType.color &&
        itemType.isSystem,
      `System item type ${expectedType.slug} does not match the seed specification.`
    );
  }

  assertCondition(
    demoUser.collections.length ===
      Object.keys(EXPECTED_COLLECTION_ITEM_COUNTS).length,
    `Expected ${
      Object.keys(EXPECTED_COLLECTION_ITEM_COUNTS).length
    } demo collections, found ${demoUser.collections.length}.`
  );
  assertCondition(
    demoUser.collections.length === FREE_COLLECTION_LIMIT,
    `Free demo user must have exactly ${FREE_COLLECTION_LIMIT} collections.`
  );

  const itemCountsByType = new Map<string, number>();

  for (const collection of demoUser.collections) {
    const expectedCount =
      EXPECTED_COLLECTION_ITEM_COUNTS[
        collection.name as keyof typeof EXPECTED_COLLECTION_ITEM_COUNTS
      ];

    assertCondition(
      expectedCount !== undefined,
      `Unexpected demo collection: ${collection.name}.`
    );
    assertCondition(
      collection.items.length === expectedCount,
      `Collection ${collection.name} expected ${expectedCount} items, found ${collection.items.length}.`
    );

    for (const item of collection.items) {
      itemCountsByType.set(
        item.type.slug,
        (itemCountsByType.get(item.type.slug) ?? 0) + 1
      );

      if (item.contentType === ItemContentType.URL || item.type.slug === "link") {
        assertCondition(
          item.url?.startsWith("https://"),
          `Link item ${item.title} must have an HTTPS URL.`
        );
      } else {
        assertCondition(
          item.content,
          `Text item ${item.title} must include content.`
        );
      }
    }
  }

  for (const [typeSlug, expectedCount] of Object.entries(EXPECTED_ITEMS_BY_TYPE)) {
    assertCondition(
      itemCountsByType.get(typeSlug) === expectedCount,
      `Expected ${expectedCount} ${typeSlug} items, found ${
        itemCountsByType.get(typeSlug) ?? 0
      }.`
    );
  }

  assertCondition(
    demoUser.items.length === 18,
    `Expected 18 demo items, found ${demoUser.items.length}.`
  );
  assertCondition(
    demoUser.items.length < FREE_ITEM_LIMIT,
    `Free demo user must have fewer than ${FREE_ITEM_LIMIT} items.`
  );

  console.log("Database connection and demo seed data OK");
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
        demoUser: {
          email: demoUser.email,
          name: demoUser.name,
          emailVerified: demoUser.emailVerified,
          plan: demoUser.plan,
          subscriptionStatus: demoUser.subscriptionStatus,
          passwordVerified: true,
        },
        systemItemTypes,
        collections: demoUser.collections.map((collection) => ({
          name: collection.name,
          slug: collection.slug,
          description: collection.description,
          isFavorite: collection.isFavorite,
          itemCount: collection.items.length,
          items: collection.items.map((item) => ({
            title: item.title,
            type: item.type.slug,
            contentType: item.contentType,
            language: item.language,
            url: item.url,
            isFavorite: item.isFavorite,
            isPinned: item.isPinned,
          })),
        })),
        itemsByType: Object.fromEntries(
          [...itemCountsByType.entries()].sort(([left], [right]) =>
            left.localeCompare(right)
          )
        ),
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
