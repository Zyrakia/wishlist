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

<label class="container">
	<p class="label">{label}</p>

	{@render control()}

	{#if errorMessage}
		<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
			{errorMessage}
		</p>
	{/if}
</label>

<style>
	.container {
		width: 100%;
		position: relative;

		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.container > :global(input),
	.container > :global(textarea) {
		outline: none;
		border: 1px solid black;

		padding: 0.5rem;
		border-radius: 6px;
	}

	.container > :global(input:focus),
	.container > :global(textarea:focus),
	.container > :global(select:focus) {
		border-color: blue;
	}

	.container > :global(input[aria-invalid]),
	.container > :global(textarea[aria-invalid]),
	.container > :global(select[aria-invalid]) {
		border-color: red;
	}

	.container:has(:global(:is(input, textarea, select)[required])) .label::after {
		content: ' *';
		color: red;
		font-weight: bold;
	}

	.error {
		position: absolute;
		top: 0;
		right: 0;

		padding-right: 0.5rem;
		border-right: 1px dashed red;

		font-weight: bold;
		font-size: small;
		color: crimson;
	}
</style>
