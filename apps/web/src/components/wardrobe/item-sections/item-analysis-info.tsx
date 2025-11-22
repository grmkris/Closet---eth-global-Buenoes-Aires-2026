import type { WardrobeItemDetails } from "@/utils/orpc-types";

type ItemAnalysisInfoProps = {
	analysis: WardrobeItemDetails["analysis"];
};

export function ItemAnalysisInfo({ analysis }: ItemAnalysisInfoProps) {
	if (!analysis) {
		return null;
	}

	return (
		<div className="text-muted-foreground text-xs">
			Analysis version: {analysis.modelVersion}
		</div>
	);
}
