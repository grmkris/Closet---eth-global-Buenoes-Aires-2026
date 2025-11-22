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
		<div className="container space-y-6 py-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">My Wardrobe</h1>
				<p className="text-muted-foreground">
					Manage your clothing items and their classifications
				</p>
			</div>

			<WardrobeGallery />
		</div>
	);
}
