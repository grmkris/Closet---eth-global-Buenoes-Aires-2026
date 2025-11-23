"use client";

import { Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type OutfitSuggestionCardProps = {
	outfit?: {
		id: string;
		items: Array<{
			id: string;
			imageUrl: string;
			name: string;
		}>;
		occasion?: string;
	};
};

export function OutfitSuggestionCard({ outfit }: OutfitSuggestionCardProps) {
	if (!outfit) {
		return (
			<Card className="p-8 text-center">
				<div className="space-y-4">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-muted-foreground/30 border-dashed">
						<Sparkles className="h-8 w-8 text-muted-foreground" />
					</div>
					<div>
						<h3 className="font-semibold text-base">No outfit ready yet</h3>
						<p className="mt-1 text-muted-foreground text-sm">
							Upload your wardrobe items to get AI-powered outfit suggestions
						</p>
					</div>
					<Button asChild className="w-full sm:w-auto">
						<Link href="/wardrobe">Upload Photos</Link>
					</Button>
				</div>
			</Card>
		);
	}

	return (
		<Card className="overflow-hidden transition-shadow hover:shadow-md">
			<div className="p-4">
				<div className="mb-3 flex items-center justify-between">
					<div>
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							Suggested for you
						</p>
						{outfit.occasion && (
							<p className="mt-0.5 font-medium text-sm">{outfit.occasion}</p>
						)}
					</div>
					<Button asChild size="sm" variant="ghost">
						<Link href="/chat">Customize</Link>
					</Button>
				</div>

				{/* Horizontal outfit items */}
				<div className="flex gap-2 overflow-x-auto">
					{outfit.items.map((item) => (
						<div
							className="relative flex-shrink-0"
							key={item.id}
							style={{ width: "calc((100% - 8px) / 3)" }}
						>
							<div className="aspect-square overflow-hidden rounded-lg border bg-muted">
								<Image
									alt={item.name}
									className="h-full w-full object-cover"
									height={100}
									loading="lazy"
									src={item.imageUrl}
									width={100}
								/>
							</div>
						</div>
					))}
				</div>
			</div>
		</Card>
	);
}
