"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInFlow } from "@/components/auth/sign-in-flow";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
	const router = useRouter();
	const { data: session } = authClient.useSession();

	// Redirect authenticated users to home
	useEffect(() => {
		if (session?.user) {
			router.push("/");
		}
	}, [session, router]);

	// Don't render sign-in flow if already authenticated (redirect in progress)
	if (session?.user) {
		return (
			<div className="flex h-svh items-center justify-center p-4">
				<div className="text-center">
					<div className="mb-4 text-4xl">✅</div>
					<p className="text-muted-foreground text-sm sm:text-base">
						Already authenticated. Redirecting...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-svh items-center justify-center p-4 pb-24 md:pb-4">
			<SignInFlow session={session} />
		</div>
	);
}
