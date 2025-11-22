CREATE TYPE "public"."clothing_item_status" AS ENUM('awaiting_upload', 'queued', 'processing_image', 'analyzing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tag_source" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "clothing_analysis" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clothing_analysis_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "clothing_item_category" (
	"item_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clothing_item_category_item_id_category_id_pk" PRIMARY KEY("item_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "clothing_item_color" (
	"item_id" uuid NOT NULL,
	"color_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clothing_item_color_item_id_color_id_pk" PRIMARY KEY("item_id","color_id")
);
--> statement-breakpoint
CREATE TABLE "clothing_item_tag" (
	"item_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"source" "tag_source" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clothing_item_tag_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "clothing_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"image_key" text NOT NULL,
	"processed_image_key" text,
	"thumbnail_key" text,
	"status" "clothing_item_status" DEFAULT 'awaiting_upload' NOT NULL,
	"error_details" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "color" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hex_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "color_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tag_type" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_type_id_name_unique" UNIQUE("type_id","name")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_analysis" ADD CONSTRAINT "clothing_analysis_item_id_clothing_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."clothing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item_category" ADD CONSTRAINT "clothing_item_category_item_id_clothing_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."clothing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item_category" ADD CONSTRAINT "clothing_item_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item_color" ADD CONSTRAINT "clothing_item_color_item_id_clothing_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."clothing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item_color" ADD CONSTRAINT "clothing_item_color_color_id_color_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."color"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item_tag" ADD CONSTRAINT "clothing_item_tag_item_id_clothing_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."clothing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item_tag" ADD CONSTRAINT "clothing_item_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item" ADD CONSTRAINT "clothing_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_type_id_tag_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."tag_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_name_idx" ON "category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clothing_analysis_item_id_idx" ON "clothing_analysis" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "clothing_item_category_item_id_idx" ON "clothing_item_category" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "clothing_item_category_category_id_idx" ON "clothing_item_category" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "clothing_item_color_item_id_idx" ON "clothing_item_color" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "clothing_item_color_color_id_idx" ON "clothing_item_color" USING btree ("color_id");--> statement-breakpoint
CREATE INDEX "clothing_item_tag_item_id_idx" ON "clothing_item_tag" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "clothing_item_tag_tag_id_idx" ON "clothing_item_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "clothing_item_tag_source_idx" ON "clothing_item_tag" USING btree ("source");--> statement-breakpoint
CREATE INDEX "clothing_item_user_id_idx" ON "clothing_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clothing_item_status_idx" ON "clothing_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clothing_item_user_id_status_idx" ON "clothing_item" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "color_name_idx" ON "color" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tag_type_name_idx" ON "tag_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tag_type_id_idx" ON "tag" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "tag_usage_count_idx" ON "tag" USING btree ("usage_count");