import type { AiClient } from "@ai-stilist/ai";
import type { Auth } from "@ai-stilist/auth";
import type { Database } from "@ai-stilist/db";
import type { Logger } from "@ai-stilist/logger";
import type { QueueClient } from "@ai-stilist/queue";
import type { RequestId } from "@ai-stilist/shared/typeid";
import type { StorageClient } from "@ai-stilist/storage";
import type { OutfitGenerator } from "@ai-stilist/wardrobe/outfit-generator";

export type CreateContextOptions = {
	authClient: Auth;
	db: Database;
	storage: StorageClient;
	queue: QueueClient;
	aiClient: AiClient;
	logger: Logger;
	outfitGenerator: OutfitGenerator;
	headers: Headers;
	requestId: RequestId;
};

export async function createContext({
	authClient,
	db,
	storage,
	queue,
	aiClient,
	logger,
	outfitGenerator,
	headers,
	requestId,
}: CreateContextOptions) {
	const session = await authClient.api.getSession({
		headers,
	});
	return {
		session,
		db,
		storage,
		queue,
		aiClient,
		logger,
		outfitGenerator,
		headers,
		requestId,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
