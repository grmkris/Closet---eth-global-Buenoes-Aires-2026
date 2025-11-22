import type { ClothingItemId } from "@ai-stilist/shared/typeid";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { client, orpc, queryClient } from "@/utils/orpc";
import type { WardrobeItemsResponse } from "@/utils/orpc-types";

type UseItemDeleteParams = {
	onSuccess?: () => void;
};

export function useItemDelete({ onSuccess }: UseItemDeleteParams = {}) {
	const [showConfirm, setShowConfirm] = useState(false);

	const mutation = useMutation({
		mutationFn: (variables: { itemId: ClothingItemId }) =>
			client.wardrobe.deleteItem(variables),
		onMutate: async (variables) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});

			// Snapshot previous value
			const previousItems = queryClient.getQueryData(
				orpc.wardrobe.getItems.queryKey({ input: {} })
			);

			// Optimistically update by removing the item
			queryClient.setQueryData(
				orpc.wardrobe.getItems.queryKey({ input: {} }),
				(old: WardrobeItemsResponse | undefined) => {
					if (!old) {
						return old;
					}
					return {
						...old,
						items: old.items.filter((i) => i.id !== variables.itemId),
						pagination: {
							...old.pagination,
							total: old.pagination.total - 1,
						},
					};
				}
			);

			// Call onSuccess callback (e.g., close dialog)
			onSuccess?.();

			return { previousItems };
		},
		onSuccess: () => {
			toast.success("Item deleted successfully");
		},
		onError: (error, _variables, context) => {
			toast.error(`Failed to delete item: ${error.message}`);

			// Rollback on error
			if (context?.previousItems) {
				queryClient.setQueryData(
					orpc.wardrobe.getItems.queryKey({ input: {} }),
					context.previousItems
				);
			}
		},
		onSettled: () => {
			// Refetch to ensure sync
			queryClient.invalidateQueries({
				queryKey: orpc.wardrobe.getItems.queryKey({ input: {} }),
			});
		},
	});

	const handleDelete = (itemId: ClothingItemId) => {
		mutation.mutate({ itemId });
	};

	return {
		showConfirm,
		setShowConfirm,
		handleDelete,
		isPending: mutation.isPending,
	};
}
