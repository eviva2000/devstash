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
  throw new Error("DATABASE_URL must be set before seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_USER = {
  email: "demo@devstash.io",
  name: "Demo User",
  password: "12345678",
} as const;

const SYSTEM_ITEM_TYPES = [
  {
    name: "snippet",
    slug: "snippet",
    icon: "Code",
    color: "#3b82f6",
    isSystem: true,
  },
  {
    name: "prompt",
    slug: "prompt",
    icon: "Sparkles",
    color: "#8b5cf6",
    isSystem: true,
  },
  {
    name: "command",
    slug: "command",
    icon: "Terminal",
    color: "#f97316",
    isSystem: true,
  },
  {
    name: "note",
    slug: "note",
    icon: "StickyNote",
    color: "#fde047",
    isSystem: true,
  },
  {
    name: "file",
    slug: "file",
    icon: "File",
    color: "#6b7280",
    isSystem: true,
  },
  {
    name: "image",
    slug: "image",
    icon: "Image",
    color: "#ec4899",
    isSystem: true,
  },
  {
    name: "link",
    slug: "link",
    icon: "Link",
    color: "#10b981",
    isSystem: true,
  },
] as const;

type ItemTypeSlug = (typeof SYSTEM_ITEM_TYPES)[number]["slug"];

const COLLECTIONS = [
  {
    name: "React Patterns",
    slug: "react-patterns",
    description: "Reusable React patterns and hooks",
    isFavorite: true,
  },
  {
    name: "AI Workflows",
    slug: "ai-workflows",
    description: "AI prompts and workflow automations",
    isFavorite: true,
  },
  {
    name: "DevOps",
    slug: "devops",
    description: "Infrastructure and deployment resources",
    isFavorite: false,
  },
] as const;

type CollectionSlug = (typeof COLLECTIONS)[number]["slug"];

type SeedItem = {
  title: string;
  description: string;
  collectionSlug: CollectionSlug;
  typeSlug: ItemTypeSlug;
  contentType: ItemContentType;
  content?: string;
  language?: string;
  url?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
};

function lines(value: string[]) {
  return value.join("\n");
}

const ITEMS: SeedItem[] = [
  {
    title: "useDebounce Hook",
    description: "Delay value updates until the user stops changing input.",
    collectionSlug: "react-patterns",
    typeSlug: "snippet",
    contentType: ItemContentType.TEXT,
    language: "typescript",
    isFavorite: true,
    isPinned: true,
    content: lines([
      "import { useEffect, useState } from \"react\";",
      "",
      "export function useDebounce<T>(value: T, delay = 300) {",
      "  const [debouncedValue, setDebouncedValue] = useState(value);",
      "",
      "  useEffect(() => {",
      "    const timeout = window.setTimeout(() => {",
      "      setDebouncedValue(value);",
      "    }, delay);",
      "",
      "    return () => window.clearTimeout(timeout);",
      "  }, [value, delay]);",
      "",
      "  return debouncedValue;",
      "}",
    ]),
  },
  {
    title: "Compound Component Pattern",
    description: "Share state across ergonomic child components with context.",
    collectionSlug: "react-patterns",
    typeSlug: "snippet",
    contentType: ItemContentType.TEXT,
    language: "typescript",
    content: lines([
      "import { createContext, useContext, useState } from \"react\";",
      "",
      "type TabsContextValue = {",
      "  activeTab: string;",
      "  setActiveTab: (value: string) => void;",
      "};",
      "",
      "const TabsContext = createContext<TabsContextValue | null>(null);",
      "",
      "export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {",
      "  const [activeTab, setActiveTab] = useState(defaultValue);",
      "",
      "  return (",
      "    <TabsContext.Provider value={{ activeTab, setActiveTab }}>",
      "      {children}",
      "    </TabsContext.Provider>",
      "  );",
      "}",
      "",
      "export function useTabs() {",
      "  const context = useContext(TabsContext);",
      "",
      "  if (!context) {",
      "    throw new Error(\"useTabs must be used within Tabs\");",
      "  }",
      "",
      "  return context;",
      "}",
    ]),
  },
  {
    title: "Class Name Utility",
    description: "Merge conditional class names without noisy templates.",
    collectionSlug: "react-patterns",
    typeSlug: "snippet",
    contentType: ItemContentType.TEXT,
    language: "typescript",
    content: lines([
      "type ClassValue = string | false | null | undefined;",
      "",
      "export function cx(...values: ClassValue[]) {",
      "  return values.filter(Boolean).join(\" \");",
      "}",
      "",
      "const buttonClass = cx(",
      "  \"inline-flex items-center rounded-md px-3 py-2\",",
      "  isActive && \"bg-blue-600 text-white\",",
      "  isDisabled && \"cursor-not-allowed opacity-50\"",
      ");",
    ]),
  },
  {
    title: "Code Review Prompt",
    description: "Ask an assistant to review a patch for production risks.",
    collectionSlug: "ai-workflows",
    typeSlug: "prompt",
    contentType: ItemContentType.TEXT,
    isFavorite: true,
    content: lines([
      "Review this change as a senior engineer.",
      "",
      "Prioritize correctness, security, data loss risks, accessibility, and missing tests.",
      "Return findings first, ordered by severity, with file and line references.",
      "Avoid restating what the patch does unless it explains a concrete risk.",
    ]),
  },
  {
    title: "Documentation Generation Prompt",
    description: "Generate concise documentation from implementation details.",
    collectionSlug: "ai-workflows",
    typeSlug: "prompt",
    contentType: ItemContentType.TEXT,
    content: lines([
      "Write developer documentation for the following module.",
      "",
      "Include purpose, public API, configuration, examples, edge cases, and testing notes.",
      "Keep the document factual and omit marketing language.",
      "Flag any behavior that is inferred rather than explicit in the code.",
    ]),
  },
  {
    title: "Refactoring Assistance Prompt",
    description: "Plan a refactor while preserving current behavior.",
    collectionSlug: "ai-workflows",
    typeSlug: "prompt",
    contentType: ItemContentType.TEXT,
    content: lines([
      "Help refactor this code without changing behavior.",
      "",
      "First identify responsibilities, hidden coupling, and risky assumptions.",
      "Then propose a small-step plan with tests after each meaningful step.",
      "Prefer existing project patterns over new abstractions.",
    ]),
  },
  {
    title: "Multi-stage Dockerfile",
    description: "Production-oriented Dockerfile pattern for a Node app.",
    collectionSlug: "devops",
    typeSlug: "snippet",
    contentType: ItemContentType.TEXT,
    language: "dockerfile",
    content: lines([
      "FROM node:22-alpine AS deps",
      "WORKDIR /app",
      "COPY package*.json ./",
      "RUN npm ci",
      "",
      "FROM node:22-alpine AS build",
      "WORKDIR /app",
      "COPY --from=deps /app/node_modules ./node_modules",
      "COPY . .",
      "RUN npm run build",
      "",
      "FROM node:22-alpine AS runner",
      "WORKDIR /app",
      "ENV NODE_ENV=production",
      "COPY --from=build /app .",
      "CMD [\"npm\", \"run\", \"start\"]",
    ]),
  },
  {
    title: "Deploy With Database Migration",
    description: "Run Prisma migrations before starting a production deploy.",
    collectionSlug: "devops",
    typeSlug: "command",
    contentType: ItemContentType.TEXT,
    language: "shell",
    isPinned: true,
    content: "npm run prisma:generate && npx prisma migrate deploy && npm run build",
  },
  {
    title: "Prisma Migrate Documentation",
    description: "Official Prisma guide for production migrations.",
    collectionSlug: "devops",
    typeSlug: "link",
    contentType: ItemContentType.URL,
    url: "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
  },
  {
    title: "Docker Compose Documentation",
    description: "Official Docker Compose documentation.",
    collectionSlug: "devops",
    typeSlug: "link",
    contentType: ItemContentType.URL,
    url: "https://docs.docker.com/compose/",
  },
  {
    title: "Undo Last Git Commit",
    description: "Move the last commit back into the working tree.",
    collectionSlug: "devops",
    typeSlug: "command",
    contentType: ItemContentType.TEXT,
    language: "shell",
    content: "git reset --soft HEAD~1",
  },
  {
    title: "Docker Container Logs",
    description: "Follow recent logs for a running container.",
    collectionSlug: "devops",
    typeSlug: "command",
    contentType: ItemContentType.TEXT,
    language: "shell",
    content: "docker logs --follow --tail 100 <container>",
  },
  {
    title: "Find Process Using Port",
    description: "Identify the process bound to a local port.",
    collectionSlug: "devops",
    typeSlug: "command",
    contentType: ItemContentType.TEXT,
    language: "shell",
    content: "lsof -nP -iTCP:3000 -sTCP:LISTEN",
  },
  {
    title: "Explain Dependency Versions",
    description: "Show why a package is installed in an npm project.",
    collectionSlug: "devops",
    typeSlug: "command",
    contentType: ItemContentType.TEXT,
    language: "shell",
    content: "npm explain <package-name>",
  },
  {
    title: "Tailwind CSS Documentation",
    description: "Utility-first CSS framework reference.",
    collectionSlug: "react-patterns",
    typeSlug: "link",
    contentType: ItemContentType.URL,
    url: "https://tailwindcss.com/docs",
  },
  {
    title: "shadcn/ui Components",
    description: "Accessible component examples built for React apps.",
    collectionSlug: "react-patterns",
    typeSlug: "link",
    contentType: ItemContentType.URL,
    url: "https://ui.shadcn.com/docs/components",
  },
  {
    title: "Material Design",
    description: "Google's design system guidelines and components.",
    collectionSlug: "react-patterns",
    typeSlug: "link",
    contentType: ItemContentType.URL,
    url: "https://m3.material.io/",
  },
  {
    title: "Lucide Icons",
    description: "Icon library used by Devstash item types.",
    collectionSlug: "react-patterns",
    typeSlug: "link",
    contentType: ItemContentType.URL,
    url: "https://lucide.dev/icons/",
  },
];

if (COLLECTIONS.length !== FREE_COLLECTION_LIMIT) {
  throw new Error(
    `The Free demo user must have exactly ${FREE_COLLECTION_LIMIT} collections.`
  );
}

if (ITEMS.length >= FREE_ITEM_LIMIT) {
  throw new Error(
    `The Free demo user must have fewer than ${FREE_ITEM_LIMIT} items.`
  );
}

async function seedSystemItemTypes() {
  const itemTypesBySlug = new Map<ItemTypeSlug, string>();

  for (const itemType of SYSTEM_ITEM_TYPES) {
    const existingItemType = await prisma.itemType.findFirst({
      where: {
        slug: itemType.slug,
        userId: null,
      },
    });

    const savedItemType = existingItemType
      ? await prisma.itemType.update({
          where: { id: existingItemType.id },
          data: itemType,
        })
      : await prisma.itemType.create({
          data: itemType,
        });

    itemTypesBySlug.set(itemType.slug, savedItemType.id);
  }

  await prisma.itemType.deleteMany({
    where: {
      slug: "url",
      userId: null,
      items: {
        none: {},
      },
    },
  });

  return itemTypesBySlug;
}

async function seedDemoUser() {
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);

  return prisma.user.upsert({
    where: {
      email: DEMO_USER.email,
    },
    create: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      passwordHash,
      emailVerified: new Date(),
      plan: SubscriptionPlan.FREE,
      subscriptionStatus: SubscriptionStatus.INACTIVE,
    },
    update: {
      name: DEMO_USER.name,
      passwordHash,
      emailVerified: new Date(),
      plan: SubscriptionPlan.FREE,
      subscriptionStatus: SubscriptionStatus.INACTIVE,
    },
  });
}

async function resetDemoUserContent(userId: string) {
  await prisma.item.deleteMany({
    where: {
      userId,
    },
  });

  await prisma.collection.deleteMany({
    where: {
      userId,
    },
  });

  await prisma.tag.deleteMany({
    where: {
      userId,
    },
  });
}

async function seedCollections(userId: string) {
  const collectionsBySlug = new Map<CollectionSlug, string>();

  for (const collection of COLLECTIONS) {
    const savedCollection = await prisma.collection.create({
      data: {
        ...collection,
        userId,
      },
    });

    collectionsBySlug.set(collection.slug, savedCollection.id);
  }

  return collectionsBySlug;
}

async function seedItems({
  userId,
  itemTypesBySlug,
  collectionsBySlug,
}: {
  userId: string;
  itemTypesBySlug: Map<ItemTypeSlug, string>;
  collectionsBySlug: Map<CollectionSlug, string>;
}) {
  for (const item of ITEMS) {
    const typeId = itemTypesBySlug.get(item.typeSlug);
    const collectionId = collectionsBySlug.get(item.collectionSlug);

    if (!typeId) {
      throw new Error(`Missing item type for slug: ${item.typeSlug}`);
    }

    if (!collectionId) {
      throw new Error(`Missing collection for slug: ${item.collectionSlug}`);
    }

    await prisma.item.create({
      data: {
        title: item.title,
        description: item.description,
        contentType: item.contentType,
        content: item.content,
        language: item.language,
        url: item.url,
        isFavorite: item.isFavorite ?? false,
        isPinned: item.isPinned ?? false,
        userId,
        typeId,
        collectionId,
      },
    });
  }
}

async function main() {
  const itemTypesBySlug = await seedSystemItemTypes();
  const demoUser = await seedDemoUser();

  await resetDemoUserContent(demoUser.id);

  const collectionsBySlug = await seedCollections(demoUser.id);

  await seedItems({
    userId: demoUser.id,
    itemTypesBySlug,
    collectionsBySlug,
  });

  console.log(
    `Seeded ${SYSTEM_ITEM_TYPES.length} system item types, 1 demo user, ${COLLECTIONS.length} collections, and ${ITEMS.length} items.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
