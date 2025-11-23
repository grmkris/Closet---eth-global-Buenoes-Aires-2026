import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { WardrobeGallery } from "./wardrobe-gallery";

export default async function WardrobePage() {
	const session = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
			throw: true,
		},
	});

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<div className="container space-y-4 py-4 pb-24 md:space-y-6 md:py-6 md:pb-6">
			<div>
				<h1 className="font-bold text-2xl tracking-tight md:text-3xl">
					My Wardrobe
				</h1>
				<p className="text-muted-foreground text-sm md:text-base">
					Manage your clothing items and their classifications
				</p>
			</div>

			<WardrobeGallery />
		</div>
	);
}
