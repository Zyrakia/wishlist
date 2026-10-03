<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { EyeClosedIcon, EyeIcon } from '@lucide/svelte';

	import type { RemoteFormField } from '@sveltejs/kit';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		field,
		...rest
	}: { field: RemoteFormField<string> } & Omit<HTMLInputAttributes, 'type' | 'name' | 'value'> =
		$props();

	const hasJs = useHasJs();
	let visible = $state(false);
</script>

<span class="relative flex w-full">
	<input class="input-lg pr-12" {...rest} {...field.as(visible ? 'text' : 'password')} />

	{#if hasJs()}
		<button
			type="button"
			title={visible ? 'Hide password' : 'Show password'}
			aria-label={visible ? 'Hide password' : 'Show password'}
			class="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg border-0 bg-transparent p-2 text-text-muted hover:text-text"
			onclick={() => (visible = !visible)}
		>
			{#if visible}
				<EyeIcon size={18} />
			{:else}
				<EyeClosedIcon size={18} />
			{/if}
		</button>
	{/if}
</span>
