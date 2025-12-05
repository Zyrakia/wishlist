<script lang="ts">
	import { GroupSchema, type Group } from '$lib/schemas/group';
	import { asIssue } from '$lib/util/pick-issue';
	import { safePrune } from '$lib/util/safe-prune';
	import { onMount } from 'svelte';
	import InputGroup from './input-group.svelte';
	import { fade } from 'svelte/transition';
	import { createGroup, updateGroup } from '$lib/remotes/group.remote';

	let {
		handler,
		init,
	}: {
		handler: typeof createGroup | typeof updateGroup;
		init?: Partial<Group>;
	} = $props();

	const mode: 'edit' | 'create' = $derived(handler === createGroup ? 'create' : 'edit');
	const generalIssue = $derived(asIssue(handler.fields.issues()));

	const seed = (props?: Partial<Group>) => {
		const cleanProps = safePrune(GroupSchema, props);
		handler.fields.set(cleanProps as any);
	};

	seed(init);
	onMount(() => handler.validate());
</script>

<div class="flex h-full min-h-full w-full flex-col items-center justify-center bg-background">
	<form
		{...handler}
		oninput={() => {
			handler.validate();
		}}
		class="float-container flex flex-col gap-4 p-8"
	>
		<h1 class="text-2xl font-bold">{mode === 'edit' ? 'Edit' : 'Create'} Group</h1>

		<hr class="-mt-3" />

		<InputGroup label="Name" error={asIssue(handler.fields.name)}>
			{#snippet control()}
				<input required {...handler.fields.name.as('text')} />
			{/snippet}
		</InputGroup>

		<button {...handler.buttonProps} class="bg-success text-accent-fg">
			{mode === 'create' ? 'Submit' : 'Save'}
		</button>

		{#if generalIssue}
			<p
				class="w-max rounded bg-danger p-2 text-center text-sm font-bold text-accent-fg"
				in:fade={{ duration: 150 }}
				out:fade={{ duration: 150 }}
			>
				{generalIssue}
			</p>
		{/if}
	</form>
</div>
