<script lang="ts">
	import { getSuggestedPrompt } from '$lib/runes/assistant-indicators.svelte';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { SearchIcon, SearchSlashIcon, SearchXIcon } from '@lucide/svelte';

	let {
		active = $bindable(false),
		onClick,
	}: { active: boolean; onClick?: (active: boolean) => void } = $props();

	const hasJs = useHasJs();

	const DEFAULT_COLOR = 'var(--color-text)';
	let hasIndicator = $state(false);
	let color = $state(DEFAULT_COLOR);

	$effect(() => {
		const indicator = getSuggestedPrompt();
		hasIndicator = !!indicator;
		color = indicator?.color || DEFAULT_COLOR;
	});

	const toggle = () => {
		active = !active;
		onClick?.(active);
	};
</script>

{#if hasJs()}
	<button class="border-0 p-2" onclick={toggle}>
		{#if active}
			<SearchXIcon {color} />
		{:else if hasIndicator}
			<SearchSlashIcon {color} />
		{:else}
			<SearchIcon {color} />
		{/if}
	</button>
{/if}
