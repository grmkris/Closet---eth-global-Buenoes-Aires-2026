import { AgentsList } from "./agents-list";

export default async function AgentsPage() {
	return (
		<div className="container space-y-4 py-4 pb-24 md:space-y-6 md:py-6 md:pb-6">
			<div>
				<h1 className="font-bold text-2xl tracking-tight md:text-3xl">
					AI Stylist Agents
				</h1>
				<p className="text-muted-foreground text-sm md:text-base">
					Browse and subscribe to AI fashion agents
				</p>
			</div>

			<AgentsList />
		</div>
	);
}
