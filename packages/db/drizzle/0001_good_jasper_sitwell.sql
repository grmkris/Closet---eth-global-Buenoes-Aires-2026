DROP TABLE "clothing_embedding" CASCADE;--> statement-breakpoint
ALTER TABLE "clothing_item" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "clothing_item" DROP COLUMN "processing_job_id";