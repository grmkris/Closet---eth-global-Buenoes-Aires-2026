import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
	size?: "sm" | "md" | "lg";
	iconOnly?: boolean;
	className?: string;
};

export function Logo({ size = "md", iconOnly = false, className }: LogoProps) {
	const sizes = {
		sm: {
			container: "gap-2",
			icon: "size-6",
			text: "text-base",
		},
		md: {
			container: "gap-2.5",
			icon: "size-8",
			text: "text-lg",
		},
		lg: {
			container: "gap-3",
			icon: "size-10",
			text: "text-xl",
		},
	};

	const sizeClasses = sizes[size];

	return (
		<Link
			className={cn("flex items-center", sizeClasses.container, className)}
			href="/"
		>
			{/* Logo Icon */}
			<div
				className={cn(
					"relative flex items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80",
					sizeClasses.icon
				)}
			>
				<svg
					aria-hidden="true"
					className="size-[60%]"
					fill="none"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					{/* Hanger icon stylized */}
					<path
						className="text-primary-foreground"
						d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
						fill="currentColor"
					/>
					<path
						className="text-primary-foreground"
						d="M4 8a1 1 0 0 1 1-1h14a1 1 0 0 1 .894 1.447l-6 12A1 1 0 0 1 13 21h-2a1 1 0 0 1-.894-.553l-6-12A1 1 0 0 1 4 8Z"
						fill="currentColor"
					/>
					<path
						className="text-primary-foreground"
						d="M12 4v3"
						stroke="currentColor"
						strokeLinecap="round"
						strokeWidth="2"
					/>
				</svg>
			</div>

			{/* Wordmark */}
			{!iconOnly && (
				<span
					className={cn(
						"font-semibold text-foreground tracking-tight",
						sizeClasses.text
					)}
				>
					AI Stilist
				</span>
			)}
		</Link>
	);
}
