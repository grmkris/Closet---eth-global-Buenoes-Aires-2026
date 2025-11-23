"use client";

import { Camera, Home, MessageSquare, Shirt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Mobile-only bottom navigation bar
 * Replaces header on mobile devices (<768px)
 */
export function BottomNav() {
	const pathname = usePathname();

	const routes = [
		{
			href: "/dashboard",
			label: "Home",
			icon: Home,
			active: pathname === "/dashboard",
		},
		{
			href: "/wardrobe",
			label: "Wardrobe",
			icon: Shirt,
			active: pathname === "/wardrobe",
		},
		{
			href: "/wardrobe",
			label: "Upload",
			icon: Camera,
			active: false,
			isFAB: true, // Floating Action Button (center) - temporarily links to wardrobe
		},
		{
			href: "/chat",
			label: "Chat",
			icon: MessageSquare,
			active: pathname.startsWith("/chat"),
		},
	] as const;

	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
			style={{
				paddingBottom: "var(--safe-area-inset-bottom)",
			}}
		>
			<div className="flex h-16 items-center justify-around px-2">
				{routes.map((route) => {
					const Icon = route.icon;

					if ("isFAB" in route && route.isFAB) {
						return (
							<Link
								className="flex flex-col items-center justify-center gap-0.5 rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-transform active:scale-95"
								href={route.href}
								key={route.href}
							>
								<Icon className="h-6 w-6" />
								<span className="sr-only">{route.label}</span>
							</Link>
						);
					}

					return (
						<Link
							aria-current={route.active ? "page" : undefined}
							className={cn(
								"flex min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 font-medium text-xs transition-colors",
								route.active
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
							href={route.href}
							key={route.href}
						>
							<Icon
								className={cn(
									"h-5 w-5 transition-transform",
									route.active && "scale-110"
								)}
							/>
							<span>{route.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
