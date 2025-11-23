import type { Logger } from "@ai-stilist/logger";
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

export type WalletConfig = {
	apiKeyFile: string;
	logger?: Logger;
};

export type CreateWalletOptions = {
	networkId?: string;
};

export function createWalletClient(config: WalletConfig) {
	const { apiKeyFile, logger } = config;

	// Initialize Coinbase SDK
	Coinbase.configureFromJson({ filePath: apiKeyFile });

	/**
	 * Create new CDP Server Wallet
	 */
	async function createWallet(
		options: CreateWalletOptions = {}
	): Promise<Wallet> {
		const { networkId = "base-mainnet" } = options;

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
