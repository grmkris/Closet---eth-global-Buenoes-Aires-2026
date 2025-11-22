import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { DrawerFooter } from "@/components/ui/drawer";
import type { useItemDelete } from "./hooks/use-item-delete";

type ItemDetailFooterProps = {
	variant: "mobile" | "desktop";
	itemId: ClothingItemId;
	deleteState: ReturnType<typeof useItemDelete>;
};

export function ItemDetailFooter({
	variant,
	itemId,
	deleteState,
}: ItemDetailFooterProps) {
	const { showConfirm, setShowConfirm, handleDelete, isPending } = deleteState;

	const isMobile = variant === "mobile";

	const confirmButtons = (
		<>
			{isMobile ? (
				<div className="flex w-full flex-col gap-2">
					<Button
						className="h-12 w-full"
						disabled={isPending}
						onClick={() => handleDelete(itemId)}
						variant="destructive"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Deleting...
							</>
						) : (
							"Confirm Delete"
						)}
					</Button>
					<Button
						className="h-12 w-full"
						disabled={isPending}
						onClick={() => setShowConfirm(false)}
						variant="outline"
					>
						Cancel
					</Button>
				</div>
			) : (
				<div className="flex w-full gap-2 sm:w-auto">
					<Button
						disabled={isPending}
						onClick={() => setShowConfirm(false)}
						size="sm"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={isPending}
						onClick={() => handleDelete(itemId)}
						size="sm"
						variant="destructive"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Deleting...
							</>
						) : (
							"Confirm Delete"
						)}
					</Button>
				</div>
			)}
		</>
	);

	const deleteButton = (
		<Button
			className={isMobile ? "h-12 w-full" : ""}
			disabled={isPending}
			onClick={() => setShowConfirm(true)}
			size={isMobile ? undefined : "sm"}
			variant="destructive"
		>
			<Trash2 className="mr-2 h-4 w-4" />
			Delete
		</Button>
	);

	if (isMobile) {
		return (
			<DrawerFooter className="pt-2">
				{showConfirm ? confirmButtons : deleteButton}
			</DrawerFooter>
		);
	}

	return (
		<DialogFooter>{showConfirm ? confirmButtons : deleteButton}</DialogFooter>
	);
}
