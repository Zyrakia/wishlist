<script lang="ts">
	import { getSuggestedPrompt } from '$lib/runes/assistant-indicators.svelte';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { SearchIcon, SearchSlashIcon, SearchXIcon } from '@lucide/svelte';

	let {
		active = $bindable(false),
		iconClass = 'size-6',
		onClick,
	}: {
		active: boolean;
		iconClass?: string;
		onClick?: (active: boolean) => void;
	} = $props();

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
	<button class="border-0 p-1.5 md:p-2" onclick={toggle}>
		{#if active}
			<SearchXIcon {color} class={iconClass} />
		{:else if hasIndicator}
			<SearchSlashIcon {color} class={iconClass} />
		{:else}
			<SearchIcon {color} class={iconClass} />
		{/if}
	</button>
{/if}
