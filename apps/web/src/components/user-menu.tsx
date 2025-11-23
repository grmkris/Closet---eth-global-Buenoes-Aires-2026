import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useDisconnect } from "wagmi";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

type UserMenuProps = {
	trigger?: ReactNode;
};

export default function UserMenu({ trigger }: UserMenuProps) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const { disconnect } = useDisconnect();

	if (!session) {
		return (
			<Button asChild variant="outline">
				<Link href="/login">Sign In</Link>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{trigger ?? <Button variant="outline">{session.user.name}</Button>}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>{session.user.email}</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Button
						className="w-full"
						onClick={() => {
							// First disconnect the CDP wallet, then sign out from auth
							disconnect(undefined, {
								onSuccess: () => {
									// After wallet disconnects, sign out from Better Auth
									authClient.signOut({
										fetchOptions: {
											onSuccess: () => {
												router.push("/");
											},
										},
									});
								},
								onError: (_error) => {
									authClient.signOut({
										fetchOptions: {
											onSuccess: () => {
												router.push("/");
											},
										},
									});
								},
							});
						}}
						variant="destructive"
					>
						Sign Out
					</Button>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
