"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInFlow } from "@/components/auth/sign-in-flow";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	// Redirect authenticated users to dashboard
	useEffect(() => {
		if (!isPending && session?.user) {
			router.push("/dashboard");
		}
	}, [session, isPending, router]);

	// Show loading while checking session
	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mb-4 text-4xl">⏳</div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	// Don't render sign-in flow if already authenticated (redirect in progress)
	if (session?.user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mb-4 text-4xl">✅</div>
					<p className="text-gray-600">Already authenticated. Redirecting...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<SignInFlow />
		</div>
	);
}
