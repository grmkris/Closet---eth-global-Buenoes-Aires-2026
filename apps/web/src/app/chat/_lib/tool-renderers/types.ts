import type {
	MyToolSet,
	MyUIMessagePart,
} from "@ai-stilist/api/features/ai/message-type";
import type { MessageId } from "@ai-stilist/shared/typeid";
import {
	type DynamicToolUIPart,
	getToolOrDynamicToolName,
	isToolOrDynamicToolUIPart,
	type ToolUIPart,
} from "ai";
import type { ReactNode } from "react";

/**
 * Base props for all tool renderers
 */
export type ToolRendererProps = {
	part: MyUIMessagePart;
	messageId: MessageId;
	isLatest?: boolean;
};

/**
 * Tool renderer component type
 */
export type ToolRenderer = (props: ToolRendererProps) => ReactNode;

/**
 * Registry entry for a tool renderer
 */
export type ToolRendererEntry = {
	// The renderer component
	renderer: ToolRenderer;
	// Optional display name for the tool
	displayName?: string;
	// Optional icon component
	icon?: ReactNode;
	// Whether this renderer can handle multiple tool types
	pattern?: RegExp;
};

/**
 * Tool status for visual indicators
 */
export type ToolStatus = "pending" | "running" | "success" | "error";

/**
 * Type guard to check if a part is a tool (either static or dynamic)
 */
export function isToolPart(
	part: MyUIMessagePart
): part is ToolUIPart<MyToolSet> | DynamicToolUIPart {
	return isToolOrDynamicToolUIPart(part);
}

/**
 * Type guard to check if a part is a tool call (input phase)
 */
export function isToolCall(part: MyUIMessagePart): part is (
	| ToolUIPart<MyToolSet>
	| DynamicToolUIPart
) & {
	state: "input-streaming" | "input-available";
} {
	if (!isToolOrDynamicToolUIPart(part)) {
		return false;
	}
	const toolPart = part as ToolUIPart<MyToolSet> | DynamicToolUIPart;
	return (
		toolPart.state === "input-streaming" || toolPart.state === "input-available"
	);
}

/**
 * Type guard to check if a part is a tool result (output phase)
 */
export function isToolResult(part: MyUIMessagePart): part is (
	| ToolUIPart<MyToolSet>
	| DynamicToolUIPart
) & {
	state: "output-available" | "output-error";
} {
	if (!isToolOrDynamicToolUIPart(part)) {
		return false;
	}
	const toolPart = part as ToolUIPart<MyToolSet> | DynamicToolUIPart;
	return (
		toolPart.state === "output-available" || toolPart.state === "output-error"
	);
}

/**
 * Helper to extract tool name from part
 */
export function getToolName(part: MyUIMessagePart): string | undefined {
	if (!isToolOrDynamicToolUIPart(part)) {
		return;
	}
	return getToolOrDynamicToolName(part);
}

/**
 * Helper to safely get tool input from part
 */
export function getToolInput(part: MyUIMessagePart): unknown | undefined {
	if (!isToolOrDynamicToolUIPart(part)) {
		return;
	}
	const toolPart = part as ToolUIPart<MyToolSet> | DynamicToolUIPart;
	if (
		toolPart.state === "input-streaming" ||
		toolPart.state === "input-available"
	) {
		return toolPart.input;
	}
	if (
		toolPart.state === "output-available" ||
		toolPart.state === "output-error"
	) {
		return toolPart.input;
	}
	return;
}

/**
 * Helper to safely get tool output from part
 */
export function getToolOutput(part: MyUIMessagePart): unknown | undefined {
	if (!isToolOrDynamicToolUIPart(part)) {
		return;
	}
	const toolPart = part as ToolUIPart<MyToolSet> | DynamicToolUIPart;
	if (toolPart.state === "output-available") {
		return toolPart.output;
	}
	return;
}

/**
 * Helper to get tool status from part
 */
export function getToolStatus(part: MyUIMessagePart): ToolStatus {
	if (!isToolOrDynamicToolUIPart(part)) {
		return "pending";
	}

	const toolPart = part as ToolUIPart<MyToolSet> | DynamicToolUIPart;
	switch (toolPart.state) {
		case "input-streaming":
			return "running";
		case "input-available":
			return "pending";
		case "output-available":
			return "success";
		case "output-error":
			return "error";
		default:
			return "pending";
	}
}
