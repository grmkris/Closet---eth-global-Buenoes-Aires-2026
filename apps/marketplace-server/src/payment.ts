import { type Address, createPublicClient, decodeEventLog, http } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import type { PaymentVerificationResult } from "./types";

// USDC contract addresses
const USDC_ADDRESSES = {
	"polygon-amoy": "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
	polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
} as const;

// ERC-20 Transfer event ABI
const TRANSFER_EVENT_ABI = [
	{
		type: "event",
		name: "Transfer",
		inputs: [
			{ name: "from", type: "address", indexed: true },
			{ name: "to", type: "address", indexed: true },
			{ name: "value", type: "uint256", indexed: false },
		],
	},
] as const;

/**
 * Verify that a USDC payment was made on-chain
 */
export async function verifyPaymentOnChain(props: {
	txHash: string;
	expectedAmount: number; // USD price (e.g., 299.99)
	expectedRecipient: Address;
	network: "polygon" | "polygon-amoy";
	rpcUrl?: string;
}): Promise<PaymentVerificationResult> {
	const { txHash, expectedAmount, expectedRecipient, network } = props;
	try {
		// Create viem client
		const client = createPublicClient({
			chain: props.network === "polygon" ? polygon : polygonAmoy,
			transport: http(props.rpcUrl),
		});

		// Get transaction receipt
		const receipt = await client.getTransactionReceipt({
			hash: txHash as `0x${string}`,
		});

		// Check transaction succeeded
		if (receipt.status !== "success") {
			return {
				valid: false,
				error: "Transaction failed on-chain",
			};
		}

		// Get USDC contract address for this network
		const usdcAddress = USDC_ADDRESSES[network];

		// Find Transfer event from USDC contract
		const transferLog = receipt.logs.find(
			(log) => log.address.toLowerCase() === usdcAddress.toLowerCase()
		);

		if (!transferLog) {
			return {
				valid: false,
				error: "No USDC transfer found in transaction",
			};
		}

		// Decode the Transfer event
		const decodedLog = decodeEventLog({
			abi: TRANSFER_EVENT_ABI,
			data: transferLog.data,
			topics: transferLog.topics,
		});

		const { from, to, value } = decodedLog.args;

		// Verify recipient matches
		if (to.toLowerCase() !== expectedRecipient.toLowerCase()) {
			return {
				valid: false,
				error: `Payment sent to wrong recipient. Expected: ${expectedRecipient}, Got: ${to}`,
			};
		}

		// Convert expected USD amount to USDC smallest units (6 decimals)
		const expectedUsdcUnits = BigInt(Math.round(expectedAmount * 1_000_000));

		// Verify amount matches (allow 1% variance for rounding)
		const minAmount = (expectedUsdcUnits * BigInt(99)) / BigInt(100);
		const maxAmount = (expectedUsdcUnits * BigInt(101)) / BigInt(100);

		if (value < minAmount || value > maxAmount) {
			return {
				valid: false,
				error: `Payment amount mismatch. Expected: ~${expectedAmount} USDC, Got: ${Number(value) / 1_000_000} USDC`,
			};
		}

		// Payment verified successfully
		return {
			valid: true,
			proof: {
				from,
				to,
				amount: value.toString(),
				txHash,
				blockNumber: receipt.blockNumber,
			},
		};
	} catch (error) {
		return {
			valid: false,
			error: `Payment verification failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * Create 402 payment requirements response
 */
export function createPaymentRequirements(props: {
	itemId: string;
	itemName: string;
	price: number;
	category: string;
	recipient: Address;
	network: "polygon" | "polygon-amoy";
}) {
	const { itemId, itemName, price, category, recipient, network } = props;
	return {
		x402Version: "1.0",
		accepts: [
			{
				amount: price.toFixed(2),
				currency: "USDC",
				network,
				recipient,
			},
		],
		paymentMethods: ["crypto"],
		ap2Required: true,
		item: {
			id: itemId,
			name: itemName,
			price,
			category,
		},
	};
}
