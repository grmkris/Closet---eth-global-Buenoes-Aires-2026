"use client";
import { Home, MessageSquare, Shirt, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ModeToggle } from "./mode-toggle";
import { WalletBadge } from "./wallet/wallet-badge";

export default function Header() {
	const pathname = usePathname();

	const links = [
		{ to: "/", label: "Home", icon: Home },
		{ to: "/wardrobe", label: "Wardrobe", icon: Shirt },
		{ to: "/chat", label: "Chat", icon: MessageSquare },
		{ to: "/subscribe", label: "Subscribe", icon: Sparkles },
	] as const;

	return (
		<header className="hidden md:block">
			<div className="border-border/40 border-b bg-background/80 backdrop-blur-xl">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
					{/* Logo */}
					<Logo size="sm" />

					{/* Navigation */}
					<nav className="flex gap-1">
						{links.map(({ to, label, icon: Icon }) => {
							const isActive =
								pathname === to || (to !== "/" && pathname.startsWith(to));

							return (
								<Link
									className={cn(
										"group relative flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-all duration-300",
										"hover:scale-[1.02] hover:bg-accent/50",
										isActive
											? "bg-accent text-accent-foreground"
											: "text-muted-foreground hover:text-foreground"
									)}
									href={to}
									key={to}
								>
									<Icon className="size-4 shrink-0" />
									<span>{label}</span>
									{isActive && (
										<span className="-bottom-[13px] absolute inset-x-3 h-0.5 rounded-full bg-primary" />
									)}
								</Link>
							);
						})}
					</nav>

					{/* Actions */}
					<div className="flex items-center gap-2">
						<ModeToggle />
						<WalletBadge />
					</div>
				</div>
			</div>
		</header>
	);
}
