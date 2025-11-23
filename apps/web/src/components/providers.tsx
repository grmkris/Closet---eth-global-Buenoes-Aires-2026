"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { WagmiProviderWrapper } from "@/providers/wagmi-provider";
import { queryClient } from "@/utils/orpc";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			disableTransitionOnChange
			enableSystem
		>
			<WagmiProviderWrapper>
				<QueryClientProvider client={queryClient}>
					<NuqsAdapter>{children}</NuqsAdapter>
				</QueryClientProvider>
			</WagmiProviderWrapper>
			<Toaster richColors />
		</ThemeProvider>
	);
}
