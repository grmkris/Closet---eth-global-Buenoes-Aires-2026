"use client";

import { SERVICE_URLS } from "@ai-stilist/shared/services";
import type { Config } from "@coinbase/cdp-core";
import { CDPReactProvider } from "@coinbase/cdp-react";
import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";
import type { ReactNode } from "react";
import { http } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { createConfig, WagmiProvider } from "wagmi";
import { env } from "@/env";
import { useWalletDisconnectHandler } from "@/hooks/use-wallet-disconnect-handler";

const cdpConfig: Config = {
	projectId: env.NEXT_PUBLIC_CDP_PROJECT_ID,
};

// Create environment-specific wagmi config
const wagmiConfig =
	env.NEXT_PUBLIC_APP_ENV === "prod"
		? createConfig({
				connectors: [
					createCDPEmbeddedWalletConnector({
						cdpConfig,
						providerConfig: {
							chains: [polygon],
							transports: {
								[polygon.id]: http(SERVICE_URLS.prod.chain.rpcUrl),
							},
						},
					}),
				],
				chains: [polygon],
				transports: {
					[polygon.id]: http(SERVICE_URLS.prod.chain.rpcUrl),
				},
			})
		: createConfig({
				connectors: [
					createCDPEmbeddedWalletConnector({
						cdpConfig,
						providerConfig: {
							chains: [polygonAmoy],
							transports: {
								[polygonAmoy.id]: http(SERVICE_URLS.dev.chain.rpcUrl),
							},
						},
					}),
				],
				chains: [polygonAmoy],
				transports: {
					[polygonAmoy.id]: http(SERVICE_URLS.dev.chain.rpcUrl),
				},
			});

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
			<CDPReactProvider config={cdpConfig}>
				<DisconnectHandler>{children}</DisconnectHandler>
			</CDPReactProvider>
		</WagmiProvider>
	);
}
