<script lang="ts">
	import { type Snippet } from 'svelte';
	import { type PageData } from './$types';
	import { page } from '$app/state';
	import { CircleArrowLeftIcon, UsersIcon } from '@lucide/svelte';

	let { children, data }: { children: Snippet; data: PageData } = $props();

	const group = $derived(data.group);
	const isOwn = $derived(data.isOwn);
</script>

<div class="flex h-full w-full flex-col">
	<div class="border-b border-border px-5 py-4 shadow">
		<h1 class="flex items-center gap-2 text-2xl font-semibold">
			<UsersIcon />
			{group.name}
		</h1>

		<p class="text-lg font-light italic">
			by {group.owner.name}
			{#if isOwn}
				<span class="font-bold text-danger not-italic">(You)</span>
			{/if}
		</p>

		{#if !page.url.pathname.endsWith(data.group.id)}
			<div class="mt-4 flex flex-wrap items-center gap-4">
				<a title="Go Back" href="/groups/{group.id}">
					<CircleArrowLeftIcon />
				</a>
			</div>
		{/if}
	</div>

	<div class="h-full w-full">
		{@render children()}
	</div>
</div>
