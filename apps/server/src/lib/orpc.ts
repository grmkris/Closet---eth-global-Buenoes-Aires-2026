import type { AiClient } from "@ai-stilist/ai";
import type { Auth } from "@ai-stilist/auth";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { RequestId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import type { OutfitGenerator } from "@ai-stilist/wardrobe/outfit-generator";

export type OrpcContextParams = {
	db: Database;
	logger: Logger;
	authClient: Auth;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	outfitGenerator: OutfitGenerator;
	headers: Headers;
	requestId: RequestId;
};
