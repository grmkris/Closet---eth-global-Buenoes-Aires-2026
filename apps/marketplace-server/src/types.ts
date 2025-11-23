export type MarketplaceItem = {
	id: string;
	name: string;
	description: string;
	category: string;
	brand: string;
	price: number; // USDC (in dollars, not cents)
	imageUrl: string;
	available: boolean;
	metadata: {
		size?: string[];
		color?: string[];
		material?: string;
	};
};

export type X402PaymentRequirement = {
	x402Version: string;
	accepts: Array<{
		amount: string;
		currency: string;
		network: string;
		recipient: string;
	}>;
	paymentMethods: string[];
	item: {
		id: string;
		name: string;
		price: number;
		category: string;
	};
};

export type XPaymentHeader = {
	ap2Intent: AP2Intent;
	ap2Signature: string;
	txHash: string;
	network: string;
};

export type AP2Intent = {
	userId: string;
	agentId: string;
	monthlyBudget: number; // cents
	maxPerTransaction: number; // cents
	allowedCategories: string[];
	allowedBrands?: string[];
	validFrom: string;
	validUntil: string;
};

export type XPaymentResponse = {
	txHash: string;
	status: string;
	purchaseId: string;
};

export type PurchaseRecord = {
	id: string;
	itemId: string;
	txHash: string;
	userWalletAddress: string;
	agentWalletAddress?: string;
	amount: number;
	timestamp: string;
};

export type PaymentVerificationResult = {
	valid: boolean;
	error?: string;
	proof?: {
		from: string;
		to: string;
		amount: string;
		txHash: string;
		blockNumber: bigint;
	};
};
