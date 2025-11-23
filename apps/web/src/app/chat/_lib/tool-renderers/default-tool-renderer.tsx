"use client";

import { CheckCircle, Info, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolRendererProps } from "./types";
import {
	getToolInput,
	getToolName,
	getToolStatus,
	getTypedToolOutput,
	isToolResult,
} from "./types";

const REGEX_CAMEL_CASE = /([A-Z])/g;
const REGEX_SNAKE_CASE = /([a-z])/g;
const REGEX_FIRST_LETTER = /^./;
/**
 * Converts camelCase to readable text
 */
function formatToolName(name: string): string {
	return name
		.replace(REGEX_CAMEL_CASE, " $1")
		.replace(REGEX_SNAKE_CASE, " $1")
		.replace(REGEX_FIRST_LETTER, (str) => str.toUpperCase())
		.trim();
}

/**
 * Renders data in a more user-friendly format than raw JSON
 */
function renderValue(value: unknown): React.ReactNode {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground italic">Not provided</span>;
	}

	if (typeof value === "boolean") {
		return <span className="text-foreground">{value ? "Yes" : "No"}</span>;
	}

	if (typeof value === "string") {
		return <span className="text-foreground">{value}</span>;
	}

	if (typeof value === "number") {
		return <span className="text-foreground">{value}</span>;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return <span className="text-muted-foreground italic">None</span>;
		}
		return (
			<span className="text-foreground">{value.map(String).join(", ")}</span>
		);
	}

	if (typeof value === "object") {
		return (
			<span className="font-mono text-foreground text-xs">
				{JSON.stringify(value)}
			</span>
		);
	}

	return <span className="text-foreground">{String(value)}</span>;
}

/**
 * Renders a data object as key-value pairs
 */
function DataDisplay({ data }: { data: unknown }) {
	if (!data || typeof data !== "object") {
		return <div className="text-sm">{renderValue(data)}</div>;
	}

	const entries = Object.entries(data);
	if (entries.length === 0) {
		return (
			<div className="text-center text-muted-foreground text-sm">
				No details available
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{entries.map(([key, value]) => (
				<div className="flex items-start gap-3" key={key}>
					<span className="min-w-[100px] font-medium text-muted-foreground text-sm capitalize">
						{key.replace(/([A-Z])/g, " $1").trim()}:
					</span>
					<span className="flex-1 text-sm">{renderValue(value)}</span>
				</div>
			))}
		</div>
	);
}

/**
 * Default tool renderer for any tool call or result
 * Provides a clean, user-friendly card view
 */
export function DefaultToolRenderer({ part }: ToolRendererProps) {
	const toolName = getToolName(part);
	const status = getToolStatus(part);

	if (!toolName) {
		return null;
	}

	const statusConfig = {
		pending: {
			icon: Info,
			className: "",
			color: "text-muted-foreground",
			badge: "secondary" as const,
			label: "Preparing...",
		},
		running: {
			icon: Loader2,
			className: "animate-spin",
			color: "text-primary",
			badge: "default" as const,
			label: "Working...",
		},
		success: {
			icon: CheckCircle,
			className: "",
			color: "text-primary",
			badge: "secondary" as const,
			label: "Completed",
		},
		error: {
			icon: XCircle,
			className: "",
			color: "text-destructive",
			badge: "destructive" as const,
			label: "Failed",
		},
	};

	const config = statusConfig[status];
	const StatusIcon = config.icon;
	const formattedName = formatToolName(toolName);

	const showResult = isToolResult(part) && status === "success";
	const output = showResult ? getTypedToolOutput(part, toolName) : null;
	const input = getToolInput(part);

	return (
		<div className="my-3 max-w-full overflow-hidden rounded-lg border bg-card">
			{/* Header - clean, no gradient */}
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<StatusIcon className={cn("h-4 w-4", config.className, config.color)} />
				<span className="font-medium text-sm">{formattedName}</span>
				<Badge className="ml-auto" variant={config.badge}>
					{config.label}
				</Badge>
			</div>

			{/* Content */}
			<div className="p-4">
				{status === "running" && (
					<div className="text-center text-muted-foreground text-sm">
						Processing your request...
					</div>
				)}

				{status === "error" && (
					<div className="text-destructive text-sm">
						Something went wrong. Please try again.
					</div>
				)}

				{showResult && output ? (
					<div>
						<div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Result
						</div>
						<DataDisplay data={output} />
					</div>
				) : null}

				{status === "pending" && input ? (
					<div>
						<div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Details
						</div>
						<DataDisplay data={input} />
					</div>
				) : null}
			</div>
		</div>
	);
}
