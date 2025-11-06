<script lang="ts">
	import { asIssue } from '$lib/util/pick-issue';
	import { type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	let {
		control,
		label,
		error,
	}: {
		control: Snippet<[]>;
		label: string;
		error?: string | { message: string }[];
	} = $props();

	const errorMessage = $derived(asIssue(error));
</script>

<label class="wrapper relative flex w-full flex-col gap-1">
	<p class="label font-bold">{label}</p>

	{@render control()}

	{#if errorMessage}
		<p
			in:fade={{ duration: 150 }}
			out:fade={{ duration: 150 }}
			class="absolute top-0 right-0 border-r border-dashed border-red-400 pr-2 text-xs font-bold text-red-600 uppercase"
		>
			{errorMessage}
		</p>
	{/if}
</label>

<style>
	@reference "tailwindcss";

	.wrapper:has(:global(:is(input, textarea, select)[required])) .label::after {
		@apply font-bold text-red-500;
		content: ' *';
	}
</style>
