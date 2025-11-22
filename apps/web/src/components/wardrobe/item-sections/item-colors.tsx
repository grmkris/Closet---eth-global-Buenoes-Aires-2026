import type { WardrobeItemDetails } from "@/utils/orpc-types";

type ItemColorsProps = {
	colors: WardrobeItemDetails["colors"];
};

export function ItemColors({ colors }: ItemColorsProps) {
	if (colors.length === 0) {
		return null;
	}

	return (
		<div>
			<h3 className="mb-2 font-semibold text-sm">Colors</h3>
			<div className="flex flex-wrap items-center gap-3">
				{colors.map(({ color }) => (
					<div className="flex items-center gap-2" key={color.id}>
						<div
							className="h-8 w-8 rounded-md border-2 border-border"
							style={{
								backgroundColor: color.hexCode || "#cccccc",
							}}
							title={color.name}
						/>
						<span className="text-sm capitalize">{color.name}</span>
					</div>
				))}
			</div>
		</div>
	);
}
