"use client";

import {
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Loader2,
	Wrench,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolRendererProps } from "./types";
import {
	getToolInput,
	getToolName,
	getToolOutput,
	getToolStatus,
	isToolCall,
	isToolResult,
} from "./types";

/**
 * Default tool renderer for any tool call or result
 * Provides a collapsible view with formatted JSON display
 */
export function DefaultToolRenderer({ part }: ToolRendererProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const toolName = getToolName(part);
	const status = getToolStatus(part);

	if (!toolName) {
		return null;
	}

	const statusConfig = {
		pending: {
			icon: Loader2,
			className: "animate-spin",
			color: "text-accent",
			badge: "default" as const,
			label: "Pending",
		},
		running: {
			icon: Loader2,
			className: "animate-spin",
			color: "text-primary",
			badge: "default" as const,
			label: "Running",
		},
		success: {
			icon: CheckCircle,
			className: "",
			color: "text-primary",
			badge: "secondary" as const,
			label: "Success",
		},
		error: {
			icon: XCircle,
			className: "",
			color: "text-destructive",
			badge: "destructive" as const,
			label: "Error",
		},
	};

	const config = statusConfig[status];
	const StatusIcon = config.icon;

	const getContent = () => {
		if (isToolCall(part)) {
			return {
				title: "Tool Call",
				data: getToolInput(part),
				label: "Parameters",
			};
		}
		if (isToolResult(part)) {
			return {
				title: "Tool Result",
				data: getToolOutput(part),
				label: "Output",
			};
		}
		return null;
	};

	const content = getContent();
	if (!content) {
		return null;
	}

	return (
		<div className="my-2 rounded-lg border bg-muted/30">
			<Button
				className="w-full justify-between px-3 py-2 hover:bg-muted/50"
				onClick={() => setIsExpanded(!isExpanded)}
				size="sm"
				type="button"
				variant="ghost"
			>
				<div className="flex items-center gap-2">
					{isExpanded ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
					<Wrench className="h-4 w-4 text-muted-foreground" />
					<span className="font-mono text-sm">{toolName}</span>
					<Badge className="ml-2" variant={config.badge}>
						<StatusIcon
							className={cn("mr-1 h-3 w-3", config.className, config.color)}
						/>
						{config.label}
					</Badge>
				</div>
				<span className="text-muted-foreground text-xs">{content.title}</span>
			</Button>

			{isExpanded && (
				<div className="border-t px-3 py-2">
					<div className="space-y-2">
						<div className="font-medium text-muted-foreground text-xs">
							{content.label}:
						</div>
						<pre className="overflow-x-auto rounded bg-background p-2 text-xs">
							<code>{JSON.stringify(content.data, null, 2)}</code>
						</pre>
					</div>
				</div>
			)}
		</div>
	);
}
