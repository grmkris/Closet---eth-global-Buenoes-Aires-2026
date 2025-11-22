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
CREATE TABLE "clothing_embedding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"embedding" jsonb NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"created_at" timestamp with time zone,
	CONSTRAINT "clothing_embedding_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "clothing_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"image_key" text NOT NULL,
	"image_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"processing_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clothing_metadata" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"category" text NOT NULL,
	"subcategory" text NOT NULL,
	"colors" jsonb NOT NULL,
	"primary_color" text NOT NULL,
	"patterns" jsonb NOT NULL,
	"formality" text NOT NULL,
	"seasons" jsonb NOT NULL,
	"occasions" jsonb NOT NULL,
	"fit" text NOT NULL,
	"brand" text,
	"material" text,
	"style_tags" jsonb NOT NULL,
	"user_notes" text,
	"ai_confidence" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clothing_metadata_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "outfit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"occasion" text,
	"season" text,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"generation_prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outfit_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"outfit_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "styling_rule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"rule_type" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"recommendations" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_embedding" ADD CONSTRAINT "clothing_embedding_item_id_clothing_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."clothing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_item" ADD CONSTRAINT "clothing_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clothing_metadata" ADD CONSTRAINT "clothing_metadata_item_id_clothing_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."clothing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit" ADD CONSTRAINT "outfit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_outfit_id_outfit_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_item_id_clothing_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."clothing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styling_rule" ADD CONSTRAINT "styling_rule_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clothing_embedding_item_id_idx" ON "clothing_embedding" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "clothing_item_user_id_idx" ON "clothing_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clothing_item_status_idx" ON "clothing_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clothing_item_user_id_status_idx" ON "clothing_item" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "clothing_metadata_item_id_idx" ON "clothing_metadata" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "clothing_metadata_category_idx" ON "clothing_metadata" USING btree ("category");--> statement-breakpoint
CREATE INDEX "outfit_user_id_idx" ON "outfit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "outfit_occasion_idx" ON "outfit" USING btree ("occasion");--> statement-breakpoint
CREATE INDEX "outfit_item_outfit_id_idx" ON "outfit_item" USING btree ("outfit_id");--> statement-breakpoint
CREATE INDEX "outfit_item_item_id_idx" ON "outfit_item" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "styling_rule_rule_type_idx" ON "styling_rule" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "styling_rule_active_idx" ON "styling_rule" USING btree ("active");--> statement-breakpoint
CREATE INDEX "styling_rule_priority_idx" ON "styling_rule" USING btree ("priority");