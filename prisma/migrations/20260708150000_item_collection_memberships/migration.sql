CREATE TABLE "item_collections" (
  "item_id" TEXT NOT NULL,
  "collection_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "item_collections_pkey" PRIMARY KEY ("item_id", "collection_id")
);

CREATE INDEX "item_collections_collection_id_idx" ON "item_collections"("collection_id");

ALTER TABLE "item_collections"
  ADD CONSTRAINT "item_collections_item_id_fkey"
  FOREIGN KEY ("item_id")
  REFERENCES "items"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "item_collections"
  ADD CONSTRAINT "item_collections_collection_id_fkey"
  FOREIGN KEY ("collection_id")
  REFERENCES "collections"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

INSERT INTO "item_collections" ("item_id", "collection_id", "created_at")
SELECT "id", "collection_id", COALESCE("created_at", CURRENT_TIMESTAMP)
FROM "items"
WHERE "collection_id" IS NOT NULL
ON CONFLICT ("item_id", "collection_id") DO NOTHING;
