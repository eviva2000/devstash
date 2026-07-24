-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_current_period_end" TIMESTAMP(3),
ADD COLUMN     "stripe_last_event_created_at" TIMESTAMP(3),
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_subscription_status" TEXT;

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "object_id" TEXT,
    "stripe_created_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stripe_webhook_events_type_object_id_idx" ON "stripe_webhook_events"("type", "object_id");
