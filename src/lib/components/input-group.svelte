<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
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

	const errorMessage = $derived.by(() => {
		if (typeof error === 'string') return error;
		return error?.[0]?.message;
	});
</script>

<label class="wrapper w-full relative flex flex-col gap-1">
	<p class="label font-bold">{label}</p>

	{@render control()}

	{#if errorMessage}
		<p
			in:fade={{ duration: 150 }}
			out:fade={{ duration: 150 }}
			class="absolute top-0 right-0 font-bold text-xs uppercase border-r border-dashed border-red-400 pr-2 text-red-600"
		>
			{errorMessage}
		</p>
	{/if}
</label>

<style>
	.wrapper :global(input),
	.wrapper :global(textarea) {
		outline: none;
		border: 1px solid black;

		padding: 0.5rem;
		border-radius: 6px;
	}

	.wrapper :global(input:focus),
	.wrapper :global(textarea:focus),
	.wrapper :global(select:focus) {
		border-color: blue;
	}

	.wrapper :global(input[aria-invalid]),
	.wrapper :global(textarea[aria-invalid]),
	.wrapper :global(select[aria-invalid]) {
		border-color: red;
	}

	.wrapper:has(:global(:is(input, textarea, select)[required])) .label::after {
		content: ' *';
		color: red;
		font-weight: bold;
	}
</style>
