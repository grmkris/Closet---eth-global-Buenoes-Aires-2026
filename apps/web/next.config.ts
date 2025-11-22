import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "**",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "**",
				pathname: "/**",
			},
		],
	},
};

export default nextConfig;
