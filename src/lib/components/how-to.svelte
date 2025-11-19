<script lang="ts">
	import type { Snippet } from 'svelte';

	type Step = {
		title: string;
		description?: Snippet<[]>;
		image?: string;
	};

	let { steps }: { steps: Step[] } = $props();
</script>

<div class="space-y-16 py-12">
	{#each steps as step, i}
		<div class="grid grid-cols-1 items-center gap-x-8 gap-y-10 md:grid-cols-2">
			<div class:md:order-last={i % 2 !== 0}>
				<div class="flex items-center gap-4">
					<span
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-accent/50 text-2xl font-bold text-accent-fg"
					>
						{i + 1}
					</span>
					<h3 class="text-3xl font-bold">{step.title}</h3>
				</div>

				{#if step.description}
					<div class="mt-4">
						{@render step.description()}
					</div>
				{/if}
			</div>

			{#if step.image}
				<div class="overflow-hidden rounded-xl border border-border shadow-lg">
					<img
						src={step.image}
						alt="Illustration for {step.title}"
						class="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>
