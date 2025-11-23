"use client";

import { Camera, MessageSquare, Shirt } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const actions = [
	{
		href: "/wardrobe",
		label: "Upload Photos",
		description: "Add new items",
		icon: Camera,
	},
	{
		href: "/wardrobe",
		label: "Browse Wardrobe",
		description: "View all items",
		icon: Shirt,
	},
	{
		href: "/chat",
		label: "AI Stylist",
		description: "Get advice",
		icon: MessageSquare,
	},
] as const;

export function ActionCardsGrid() {
	return (
		<div className="grid grid-cols-2 gap-3">
			{actions.map((action) => {
				const Icon = action.icon;
				return (
					<Link href={action.href} key={action.label}>
						<Card
							className={cn(
								"flex h-32 flex-col items-center justify-center p-6 text-center transition-shadow hover:shadow-md"
							)}
						>
							<Icon className="mb-2 h-8 w-8 text-primary" />
							<p className="font-medium text-sm">{action.label}</p>
							<p className="mt-0.5 text-muted-foreground text-xs">
								{action.description}
							</p>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}
