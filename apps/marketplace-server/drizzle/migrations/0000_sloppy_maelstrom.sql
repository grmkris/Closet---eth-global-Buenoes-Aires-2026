CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"tx_hash" text NOT NULL,
	"user_wallet_address" text NOT NULL,
	"agent_wallet_address" text NOT NULL,
	"amount" integer NOT NULL,
	"network" text NOT NULL,
	"payment_proof" jsonb,
	"ap2_intent" jsonb NOT NULL,
	"item_snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_tx_hash_unique" UNIQUE("tx_hash")
);
