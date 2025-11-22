"use client";

import type { Config } from "@coinbase/cdp-core";
import { CDPReactProvider } from "@coinbase/cdp-react";
import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { createConfig, WagmiProvider } from "wagmi";
import { env } from "@/env";
import { useWalletDisconnectHandler } from "@/hooks/use-wallet-disconnect-handler";

const cdpConfig: Config = {
	projectId: env.NEXT_PUBLIC_CDP_PROJECT_ID,
};

const connector = createCDPEmbeddedWalletConnector({
	cdpConfig,
	providerConfig: {
		chains: [base, baseSepolia],
		transports: {
			[base.id]: http(),
			[baseSepolia.id]: http(),
		},
	},
});

const wagmiConfig = createConfig({
	connectors: [connector],
	chains: [base, baseSepolia],
	transports: {
		[base.id]: http(),
		[baseSepolia.id]: http(),
	},
});

const queryClient = new QueryClient();

/**
 * Internal component that handles wallet disconnect events.
 * Must be inside WagmiProvider to access wagmi hooks.
 */
function DisconnectHandler({ children }: { children: ReactNode }) {
	useWalletDisconnectHandler();
	return <>{children}</>;
}

export function WagmiProviderWrapper({ children }: { children: ReactNode }) {
	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				<CDPReactProvider config={cdpConfig}>
					<DisconnectHandler>{children}</DisconnectHandler>
				</CDPReactProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
