"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const pathname = usePathname();

	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/wardrobe", label: "Wardrobe" },
		{ to: "/chat", label: "AI Chat" },
	] as const;

	return (
		<div className="hidden border-b bg-background md:block">
			<div className="flex flex-row items-center justify-between px-4 py-3">
				<nav className="flex gap-6 text-sm">
					{links.map(({ to, label }) => (
						<Link
							className={cn(
								"font-medium transition-colors hover:text-foreground",
								pathname === to || (to !== "/" && pathname.startsWith(to))
									? "text-foreground"
									: "text-muted-foreground"
							)}
							href={to}
							key={to}
						>
							{label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</div>
	);
}
