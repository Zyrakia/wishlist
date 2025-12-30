<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { SearchIcon, SparklesIcon } from '@lucide/svelte';

	const hasJs = useHasJs();

	let searchFocused = $state(false);
	let searchHovered = $state(false);
	let resultsFocused = $state(false);
	let resultsHovered = $state(false);

	const searching = $derived.by(() => {
		if (searchFocused || resultsFocused) return true;
		return resultsHovered;
	});

	const handleKeyUp = (ev: KeyboardEvent) => {
		if (searching) {
			if (ev.key === 'Escape') {
				searchFocused = false;
				searchHovered = false;
				resultsFocused = false;
				resultsHovered = false;
			}
		} else {
			if (ev.key === '/') searchFocused = true;
		}
	};

	let searchRef: HTMLInputElement | undefined = $state();
	$effect(() => {
		if (!searchRef) return;

		if (searching) {
			if (searchFocused || searchHovered) searchRef?.focus();
		} else searchRef.blur();
	});
</script>

<svelte:window onkeyup={handleKeyUp} />

{#if hasJs()}
	<div title="Search Wishii" class="flex w-full items-center justify-center gap-4 px-4">
		<SearchIcon
			size={20}
			class={`shrink-0 transition-colors ${searching ? 'text-accent' : 'text-text'}`}
		/>

		<div
			role="combobox"
			aria-expanded={searching}
			aria-haspopup="listbox"
			aria-controls="results-listbox"
			class="relative w-full max-w-full px-3 transition-all duration-300 {searching
				? 'md:w-full'
				: 'md:w-2/3'}"
		>
			<input
				name="Global Search"
				aria-haspopup="dialog"
				bind:this={searchRef}
				onfocus={() => (searchFocused = true)}
				onblur={() => (searchFocused = false)}
				onmouseenter={() => (searchHovered = true)}
				onmouseleave={() => (searchHovered = false)}
				class="w-full"
				placeholder="✨ Search people, items or ask questions..."
			/>

			<div
				id="results-listbox"
				role="listbox"
				tabindex="0"
				onfocus={() => (resultsFocused = true)}
				onblur={() => (resultsFocused = false)}
				onmouseenter={() => (resultsHovered = true)}
				onmouseleave={() => (resultsHovered = false)}
				class="absolute bottom-full left-0 max-h-85 min-h-0 w-full transition-[opacity,translate] md:top-full md:bottom-[unset] {searching
					? 'pointer-events-auto translate-y-0 opacity-100'
					: 'pointer-events-none -translate-y-8 opacity-0'}"
				class:opacity-100={searching}
			>
				<div
					class="mb-2 flex flex-col gap-3 rounded-md border bg-surface p-3 md:mt-2 md:mb-0 {resultsFocused
						? 'border-primary'
						: 'border-accent'}"
				>
					<ul class="flex-1 overflow-y-auto">
						<li class="text-text-muted italic">No results...</li>
					</ul>

					<hr />

					<div class="">
						<div class="mb-2 flex items-center gap-2 text-accent">
							<SparklesIcon size={18} />

							<span>Wishii AI</span>
						</div>

						<div aria-live="polite" id="question-response-container">
							<p class="text-text-muted italic">Not active...</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
