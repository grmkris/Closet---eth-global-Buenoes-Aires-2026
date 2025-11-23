"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AgentCard, AgentCardSkeleton } from "@/components/agents/agent-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

const SPECIALTIES = [
	{ value: "all", label: "All Specialties" },
	{ value: "minimalist", label: "⚪ Minimalist" },
	{ value: "vintage", label: "🕰️ Vintage" },
	{ value: "streetwear", label: "🎨 Streetwear" },
	{ value: "luxury", label: "💎 Luxury" },
	{ value: "sustainable", label: "🌱 Sustainable" },
] as const;

export function AgentsList() {
	const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");

	const { data, isLoading, isError } = useQuery(
		orpc.agent.list.queryOptions({
			specialty: selectedSpecialty === "all" ? undefined : selectedSpecialty,
		})
	);

	return (
		<div className="space-y-4">
			{/* Filter */}
			<div className="flex items-center gap-4">
				<Select onValueChange={setSelectedSpecialty} value={selectedSpecialty}>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder="Filter by specialty" />
					</SelectTrigger>
					<SelectContent>
						{SPECIALTIES.map((specialty) => (
							<SelectItem key={specialty.value} value={specialty.value}>
								{specialty.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, index) => (
						<AgentCardSkeleton
							key={`agent-card-skeleton-${index.toString()}`}
						/>
					))}
				</div>
			)}

			{/* Error State */}
			{isError && (
				<Alert variant="destructive">
					<AlertTitle>Error loading agents</AlertTitle>
					<AlertDescription>
						Failed to load agents. Please try again later.
					</AlertDescription>
				</Alert>
			)}

			{/* Empty State */}
			{data && data.agents.length === 0 && (
				<Alert>
					<Sparkles className="h-4 w-4" />
					<AlertTitle>No agents found</AlertTitle>
					<AlertDescription>
						{selectedSpecialty === "all"
							? "No agents are currently available. Check back soon!"
							: "No agents match the selected specialty."}
					</AlertDescription>
				</Alert>
			)}

			{/* Agents Grid */}
			{data && data.agents.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{data.agents.map((agent) => (
						<AgentCard agent={agent} key={agent.id} />
					))}
				</div>
			)}
		</div>
	);
}
