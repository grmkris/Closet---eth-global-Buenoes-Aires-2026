import type { AiClient } from "@ai-stilist/ai";

export type MockAiClientConfig = {
	generateObject?: {
		object?: unknown;
		error?: string;
		usage?: {
			totalTokens?: number;
			promptTokens?: number;
			completionTokens?: number;
		};
	};
	generateText?: {
		text?: string;
		error?: string;
	};
};

/**
 * Create a mock AI client for testing
 * Allows simulating successful responses and errors
 */
export function createMockAiClient(
	config: MockAiClientConfig = {}
): AiClient {
	return {
		getModel: () => ({} as any),

		generateObject: async ({ schema }) => {
			if (config.generateObject?.error) {
				throw new Error(config.generateObject.error);
			}

			return {
				object: config.generateObject?.object ?? {},
				usage: {
					totalTokens: config.generateObject?.usage?.totalTokens ?? 1000,
					promptTokens: config.generateObject?.usage?.promptTokens ?? 800,
					completionTokens:
						config.generateObject?.usage?.completionTokens ?? 200,
				},
			} as any;
		},

		generateText: async () => {
			if (config.generateText?.error) {
				throw new Error(config.generateText.error);
			}

			return {
				text: config.generateText?.text ?? "Mock AI response",
				usage: { totalTokens: 500, promptTokens: 400, completionTokens: 100 },
			} as any;
		},

		streamObject: async () => ({}) as any,
		streamText: async () => ({}) as any,
		generateImage: async () => ({}) as any,
		getProviderConfig: () => ({
			googleGeminiApiKey: "mock-key",
			anthropicApiKey: undefined,
			groqApiKey: undefined,
			xaiApiKey: "mock-key",
		}),
	};
}

/**
 * Create a mock AI client that always fails
 */
export function createFailingMockAiClient(errorMessage = "AI API Error"): AiClient {
	return createMockAiClient({
		generateObject: { error: errorMessage },
		generateText: { error: errorMessage },
	});
}
