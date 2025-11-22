import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStatusVariant } from "../item-detail-dialog-helpers";

type ItemStatusProps = {
	status: string;
};

export function ItemStatus({ status }: ItemStatusProps) {
	return (
		<div>
			<h3 className="mb-2 font-semibold text-sm">Status</h3>
			<Badge variant={getStatusVariant(status)}>
				{status === "processing" && (
					<Loader2 className="mr-1 h-3 w-3 animate-spin" />
				)}
				{status}
			</Badge>
		</div>
	);
}
