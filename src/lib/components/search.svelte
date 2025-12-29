<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { SearchIcon, XIcon } from '@lucide/svelte';

	const hasJs = useHasJs();

	let searching = $state(false);

	let searchRef: HTMLInputElement | undefined = $state();
	let dialogRef: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialogRef) return;

		if (searching) {
			dialogRef?.showModal();
		} else {
			dialogRef?.close();
			searchRef?.blur();
		}
	});
</script>

{#if hasJs()}
	<div class="flex w-full items-center justify-center gap-4 px-4">
		<SearchIcon
			size={20}
			class={`shrink-0 transition-colors ${searching ? 'text-accent' : 'text-text'}`}
		/>

		<input
			name="Searching toggle"
			bind:this={searchRef}
			onfocus={() => (searching = true)}
			onblur={() => (searching = false)}
			class="w-full max-w-full px-3 transition-all duration-300 focus:w-full md:w-sm"
			placeholder="✨ Search people, items or ask questions..."
		/>
	</div>
{/if}
