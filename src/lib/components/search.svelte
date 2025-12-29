<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { SearchIcon } from '@lucide/svelte';

	const hasJs = useHasJs();

	let searching = $state(false);

	let searchRef: HTMLInputElement | undefined = $state();
	let dialogRef: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialogRef) return;

		if (searching) dialogRef?.showModal();
		else dialogRef?.close();
	});

	$effect(() => {
		if (!searchRef) return;

		if (searching) searchRef?.focus();
		else searchRef.blur();
	});

	const onSearchFocus = () => {
		if (!searching) searching = true;
	};

	const onSearchBlur = () => {
		if (searching) searching = false;
	};

	const handleKeyUp = (ev: KeyboardEvent) => {
		if (searching) {
			if (ev.key === 'Escape') searchRef?.blur();
		} else {
			if (ev.key === '/') searchRef?.focus();
		}
	};
</script>

<svelte:window onkeyup={handleKeyUp} />

{#if hasJs()}
	<div class="flex w-full items-center justify-center gap-4 px-4">
		<SearchIcon
			size={20}
			class={`shrink-0 transition-colors ${searching ? 'text-accent' : 'text-text'}`}
		/>

		<div
			class="relative w-full max-w-full px-3 transition-all duration-300 {searching
				? 'md:w-full'
				: 'md:w-2/3'}"
		>
			<input
				name="Global Search"
				aria-haspopup="dialog"
				bind:this={searchRef}
				onfocus={() => onSearchFocus()}
				onblur={() => onSearchBlur()}
				class="w-full"
				placeholder="✨ Search people, items or ask questions..."
			/>
		</div>
	</div>
{/if}
