-- PostgreSQL treats NULL values as distinct in a composite unique index, so
-- item_types_user_id_slug_key does not prevent duplicate system item type slugs.
CREATE UNIQUE INDEX "item_types_system_slug_key" ON "item_types"("slug")
WHERE "user_id" IS NULL;
