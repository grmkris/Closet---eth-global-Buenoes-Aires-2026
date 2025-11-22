import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	images: {
		unoptimized: true,
		formats: ["image/avif", "image/webp"],
		domains: ["localhost"],
		remotePatterns: [
			// MinIO local storage (development)
			{
				protocol: "http",
				hostname: "localhost",
				port: "9000",
			},
			// Wildcard patterns for production storage
			{
				protocol: "http",
				hostname: "**",
			},
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

export default nextConfig;
