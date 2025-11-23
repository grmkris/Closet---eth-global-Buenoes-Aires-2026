"use client";

import { X } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UploadManager } from "./upload-manager";

type UploadModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
	const isMobile = useIsMobile();
	const [hasActiveUploads, setHasActiveUploads] = useState(false);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);

	const handleClose = () => {
		if (hasActiveUploads) {
			setShowConfirmDialog(true);
			return;
		}
		onOpenChange(false);
	};

	const handleConfirmClose = () => {
		setShowConfirmDialog(false);
		onOpenChange(false);
	};

	if (isMobile) {
		return (
			<>
				<Drawer onOpenChange={onOpenChange} open={open}>
					<DrawerContent className="max-h-[90vh]">
						<DrawerHeader className="flex items-center justify-between">
							<DrawerTitle>Upload Photos</DrawerTitle>
							<Button onClick={handleClose} size="icon" variant="ghost">
								<X className="h-4 w-4" />
							</Button>
						</DrawerHeader>
						<div className="overflow-y-auto p-4">
							<UploadManager onUploadStateChange={setHasActiveUploads} />
						</div>
					</DrawerContent>
				</Drawer>

				<AlertDialog
					onOpenChange={setShowConfirmDialog}
					open={showConfirmDialog}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Uploads in progress</AlertDialogTitle>
							<AlertDialogDescription>
								Uploads are in progress. Are you sure you want to close?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={handleConfirmClose}>
								Close anyway
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</>
		);
	}

	return (
		<>
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Upload Photos</DialogTitle>
					</DialogHeader>
					<div className="max-h-[70vh] overflow-y-auto">
						<UploadManager onUploadStateChange={setHasActiveUploads} />
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog onOpenChange={setShowConfirmDialog} open={showConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Uploads in progress</AlertDialogTitle>
						<AlertDialogDescription>
							Uploads are in progress. Are you sure you want to close?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmClose}>
							Close anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
