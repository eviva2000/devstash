CREATE TABLE "item_uploads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_type_slug" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_uploads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_uploads_file_url_key" ON "item_uploads"("file_url");
CREATE INDEX "item_uploads_user_id_idx" ON "item_uploads"("user_id");
CREATE INDEX "item_uploads_user_id_item_type_slug_idx" ON "item_uploads"("user_id", "item_type_slug");
CREATE INDEX "item_uploads_consumed_at_idx" ON "item_uploads"("consumed_at");

ALTER TABLE "item_uploads"
ADD CONSTRAINT "item_uploads_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
