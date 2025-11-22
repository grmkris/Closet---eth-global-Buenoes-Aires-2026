"use client";

import { Calendar, HelpCircle, Shirt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type AiCapabilitiesProps = {
	onSelectCapability?: (capability: string) => void;
	onSelectPrompt?: (prompt: string) => void;
};

/**
 * AI Capabilities Component
 * Showcases available AI capabilities for wardrobe management
 */
export function AiCapabilities({
	onSelectCapability,
	onSelectPrompt,
}: AiCapabilitiesProps) {
	const CAPABILITIES = [
		{
			id: "wardrobe",
			icon: Shirt,
			title: "Wardrobe Management",
			description: "Organize and manage your clothing items",
			examples: [
				"Show me all my summer clothes",
				"What tops do I have in blue?",
			],
		},
		{
			id: "outfits",
			icon: Sparkles,
			title: "Outfit Suggestions",
			description: "Get personalized outfit recommendations",
			examples: [
				"Suggest an outfit for a business meeting",
				"What should I wear to a casual dinner?",
			],
		},
		{
			id: "occasions",
			icon: Calendar,
			title: "Occasion Planning",
			description: "Plan outfits for specific events",
			examples: [
				"Help me plan outfits for my vacation",
				"What can I wear to a wedding?",
			],
		},
		{
			id: "style",
			icon: HelpCircle,
			title: "Style Advice",
			description: "Get fashion tips and style guidance",
			examples: [
				"How can I style this jacket?",
				"What colors go well with navy?",
			],
		},
	];

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
				{CAPABILITIES.map((capability) => {
					const Icon = capability.icon;
					return (
						<Button
							className="h-auto flex-col items-start gap-2 p-4 text-left"
							key={capability.id}
							onClick={() => onSelectCapability?.(capability.id)}
							type="button"
							variant="outline"
						>
							<div className="flex w-full items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
									<Icon className="h-4 w-4 text-primary" />
								</div>
								<span className="font-semibold text-sm">
									{capability.title}
								</span>
							</div>
							<p className="line-clamp-2 w-full text-muted-foreground text-xs leading-relaxed">
								{capability.description}
							</p>
							<div className="mt-1 w-full space-y-0.5">
								{capability.examples.slice(0, 2).map((example, index) => (
									<button
										className="line-clamp-1 w-full text-left text-muted-foreground text-xs leading-tight transition-colors hover:text-foreground"
										key={`${capability.id}-example-${index}`}
										onClick={(e) => {
											e.stopPropagation();
											onSelectPrompt?.(example);
										}}
										type="button"
									>
										• {example}
									</button>
								))}
							</div>
						</Button>
					);
				})}
			</div>
		</div>
	);
}
