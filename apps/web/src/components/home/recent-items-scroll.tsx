"use client";

import { Camera } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RecentItemsScrollProps = {
	items?: Array<{
		id: string;
		imageUrl: string;
		name: string;
	}>;
	isLoading?: boolean;
};

export function RecentItemsScroll({ items, isLoading }: RecentItemsScrollProps) {
	if (isLoading) {
		return (
			<div>
				<h2 className="mb-3 font-semibold text-lg">Recent additions</h2>
				<div className="flex gap-3 overflow-x-auto">
					{[1, 2, 3, 4].map((i) => (
						<div
							className="aspect-square w-32 flex-shrink-0 animate-pulse rounded-lg bg-muted"
							key={i}
						/>
					))}
				</div>
			</div>
		);
	}

	if (!items || items.length === 0) {
		return (
			<div>
				<h2 className="mb-3 font-semibold text-lg">Recent additions</h2>
				<Card className="p-8 text-center">
					<div className="space-y-3">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Camera className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-muted-foreground text-sm">
							Upload your first clothing item to get started
						</p>
						<Button asChild size="sm">
							<Link href="/wardrobe">Upload Now</Link>
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-3 flex items-center justify-between">
				<h2 className="font-semibold text-lg">Recent additions</h2>
				<Button asChild size="sm" variant="ghost">
					<Link href="/wardrobe">View all</Link>
				</Button>
			</div>
			<div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
				{items.map((item) => (
					<Link
						className="group flex-shrink-0 snap-start"
						href={`/wardrobe/${item.id}`}
						key={item.id}
					>
						<div className="relative aspect-square w-32 overflow-hidden rounded-lg border transition-shadow group-hover:shadow-md">
							<img
								alt={item.name}
								className="h-full w-full object-cover"
								src={item.imageUrl}
							/>
						</div>
					</Link>
				))}
				{items.length >= 5 && (
					<Link
						className="flex aspect-square w-32 flex-shrink-0 snap-start items-center justify-center rounded-lg border border-dashed hover:border-solid hover:bg-muted/50"
						href="/wardrobe"
					>
						<span className="text-muted-foreground text-sm">View all →</span>
					</Link>
				)}
			</div>
		</div>
	);
}
