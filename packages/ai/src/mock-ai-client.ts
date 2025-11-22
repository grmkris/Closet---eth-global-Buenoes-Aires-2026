import type { AIModelConfig, AiClient, LanguageModel } from "./ai-client";

/**
 * Mock response configuration for testing
 */
export type MockResponse<T = unknown> = {
	object: T;
	usage?: {
		totalTokens: number;
		promptTokens: number;
		completionTokens: number;
	};
	durationMs?: number;
};

/**
 * Scenarios for clothing analysis testing
 */
export const MOCK_CLOTHING_ANALYSIS = {
	tShirt: {
		object: {
			category: "t-shirt",
			colors: ["navy", "#1a365d"],
			tags: [
				"casual",
				"cotton",
				"short-sleeve",
				"crew-neck",
				"summer",
				"everyday",
			],
			confidence: 0.95,
		},
		usage: {
			totalTokens: 150,
			promptTokens: 100,
			completionTokens: 50,
		},
	},
	jeans: {
		object: {
			category: "jeans",
			colors: ["dark-blue", "#0d1b2a"],
			tags: [
				"denim",
				"casual",
				"straight-fit",
				"everyday",
				"versatile",
				"year-round",
			],
			confidence: 0.92,
		},
		usage: {
			totalTokens: 160,
			promptTokens: 100,
			completionTokens: 60,
		},
	},
	dress: {
		object: {
			category: "dress",
			colors: ["black", "#000000", "white", "#ffffff"],
			tags: [
				"formal",
				"midi-length",
				"sleeveless",
				"business",
				"cocktail",
				"summer",
				"elegant",
			],
			confidence: 0.88,
		},
		usage: {
			totalTokens: 180,
			promptTokens: 110,
			completionTokens: 70,
		},
	},
	sneakers: {
		object: {
			category: "sneakers",
			colors: ["white", "#ffffff", "grey", "#808080"],
			tags: [
				"athletic",
				"casual",
				"low-top",
				"lace-up",
				"versatile",
				"everyday",
				"comfortable",
			],
			confidence: 0.93,
		},
		usage: {
			totalTokens: 170,
			promptTokens: 105,
			completionTokens: 65,
		},
	},
	lowConfidence: {
		object: {
			category: "unknown",
			colors: ["mixed"],
			tags: ["unclear", "low-quality-image"],
			confidence: 0.3,
		},
		usage: {
			totalTokens: 80,
			promptTokens: 70,
			completionTokens: 10,
		},
	},
} as const;

/**
 * Create a mock AI client for testing
 * @param defaultResponse - Response to return by default
 * @param responseMap - Map of conditions to responses (e.g., based on image URL)
 */
export function createMockAiClient<T = unknown>(options?: {
	defaultResponse?: MockResponse<T>;
	responseMap?: Map<string, MockResponse<T>>;
	shouldFail?: boolean;
	failureMessage?: string;
}): AiClient {
	const {
		defaultResponse = MOCK_CLOTHING_ANALYSIS.tShirt as MockResponse<T>,
		responseMap = new Map(),
		shouldFail = false,
		failureMessage = "Mock AI client failure",
	} = options ?? {};

	return {
		getModel: (_aiConfig: AIModelConfig): LanguageModel => {
			// Return a minimal mock LanguageModel
			// @ts-expect-error - mocking minimal interface
			return {
				modelId: "mock-model",
				provider: "mock",
			};
		},

		generateObject: async (params: any): Promise<any> => {
			if (shouldFail) {
				throw new Error(failureMessage);
			}

			// Try to match response based on image URL in messages
			let response = defaultResponse;
			for (const message of params.messages) {
				if (message.role === "user" && Array.isArray(message.content)) {
					for (const part of message.content) {
						if (part.type === "image" && typeof part.image === "string") {
							const matchedResponse = responseMap.get(part.image);
							if (matchedResponse) {
								response = matchedResponse;
								break;
							}
						}
					}
				}
			}

			// Simulate processing time
			const delay = response.durationMs ?? 100;
			await new Promise((resolve) => setTimeout(resolve, delay));

			return {
				object: response.object,
				usage: response.usage,
				finishReason: "stop",
				request: {},
				response: {
					id: "mock-response-id",
					timestamp: new Date(),
					modelId: "mock-model",
				},
				warnings: undefined,
				rawResponse: {},
			};
		},

		streamObject: (async () => {
			throw new Error("streamObject not implemented in mock");
		}) as any,

		generateText: (async () => {
			throw new Error("generateText not implemented in mock");
		}) as any,

		streamText: (async () => {
			throw new Error("streamText not implemented in mock");
		}) as any,

		generateImage: (async () => {
			throw new Error("generateImage not implemented in mock");
		}) as any,

		getProviderConfig: () => ({
			googleGeminiApiKey: "mock-key",
		}),
	};
}
