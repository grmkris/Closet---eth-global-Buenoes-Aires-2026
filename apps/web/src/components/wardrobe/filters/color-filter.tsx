"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ColorFilterProps = {
	colors: Array<{ name: string; hexCode: string | null; count: number }>;
	selected: string[];
	onChange: (colors: string[]) => void;
};

export function ColorFilter({ colors, selected, onChange }: ColorFilterProps) {
	const toggleColor = (colorName: string) => {
		if (selected.includes(colorName)) {
			onChange(selected.filter((c) => c !== colorName));
		} else {
			onChange([...selected, colorName]);
		}
	};

	return (
		<div className="space-y-2">
			<h4 className="font-medium text-sm">Colors</h4>
			<div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
				{colors.map((color) => {
					const isSelected = selected.includes(color.name);
					return (
						<button
							className={cn(
								"group relative flex flex-col items-center gap-1 rounded-md p-2 transition-all hover:bg-muted",
								isSelected && "bg-muted"
							)}
							key={color.name}
							onClick={() => toggleColor(color.name)}
							type="button"
						>
							<div
								className={cn(
									"relative h-10 w-10 rounded-full border-2 transition-all",
									isSelected
										? "border-primary ring-2 ring-primary ring-offset-2"
										: "border-border"
								)}
								style={{
									backgroundColor: color.hexCode || "#cccccc",
								}}
								title={color.name}
							>
								{isSelected && (
									<div className="absolute inset-0 flex items-center justify-center">
										<Check className="h-5 w-5 text-white drop-shadow-md" />
									</div>
								)}
							</div>
							<span className="text-center text-xs capitalize leading-tight">
								{color.name}
							</span>
							<span className="text-muted-foreground text-xs">
								{color.count}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
