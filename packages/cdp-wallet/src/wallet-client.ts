import type { Logger } from "@ai-stilist/logger";
import type { Environment } from "@ai-stilist/shared/services";
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

export type WalletConfig = {
	/** Legacy: Path to CDP API key JSON file */
	apiKeyFile?: string;
	/** CDP API Key ID (preferred over apiKeyFile) */
	apiKeyId?: string;
	/** CDP API Key Secret (preferred over apiKeyFile) */
	apiKeySecret?: string;
	logger?: Logger;
};

export type CreateWalletOptions = {
	networkId?: string;
};

/**
 * Get CDP network ID based on environment
 * @param env - Application environment ("dev" or "prod")
 * @param network - Target network ("polygon" or "base")
 */
export function getCdpNetworkId(
	env: Environment,
	network: "polygon" | "base" = "polygon"
): string {
	if (network === "polygon") {
		return env === "dev" ? "polygon-amoy" : "polygon-mainnet";
	}
	return env === "dev" ? "base-sepolia" : "base-mainnet";
}

export function createWalletClient(config: WalletConfig) {
	const { apiKeyFile, apiKeyId, apiKeySecret, logger } = config;

	// Initialize Coinbase SDK
	if (apiKeyId && apiKeySecret) {
		// Preferred: Use API key credentials directly
		Coinbase.configure({
			apiKeyName: apiKeyId,
			privateKey: apiKeySecret,
		});
	} else if (apiKeyFile) {
		// Legacy: Use JSON file
		Coinbase.configureFromJson({ filePath: apiKeyFile });
	} else {
		throw new Error(
			"CDP wallet client requires either apiKeyId + apiKeySecret OR apiKeyFile"
		);
	}

	/**
	 * Create new CDP Server Wallet
	 * @param options.networkId - CDP network ID (e.g., "polygon-mainnet", "polygon-amoy", "base-mainnet")
	 */
	async function createWallet(
		options: CreateWalletOptions = {}
	): Promise<Wallet> {
		const { networkId = "polygon-mainnet" } = options;

		try {
			logger?.debug({ msg: "Creating CDP wallet", networkId });

			const wallet = await Wallet.create({ networkId });

			logger?.info({ msg: "Wallet created", address: wallet.getDefaultAddress() });

			return wallet;
		} catch (error) {
			logger?.error({ msg: "Wallet creation failed", error });
			throw new Error("Failed to create CDP wallet");
		}
	}

	return {
		createWallet,
	};
}

export type WalletClient = ReturnType<typeof createWalletClient>;
