<script lang="ts">
	import { type Snippet } from 'svelte';
	import { type PageData } from './$types';
	import { page } from '$app/state';
	import { CircleArrowLeftIcon, CircleIcon } from '@lucide/svelte';

	let { children, data }: { children: Snippet; data: PageData } = $props();

	const circle = $derived(data.circle);
	const isOwn = $derived(data.isOwn);

	const isAtRoot = $derived(page.url.pathname.endsWith(data.circle.id));
</script>

<div class="flex h-full w-full flex-col">
	<div class="border-b border-border px-5 py-4 shadow">
		<h1 class="flex items-center gap-2 text-2xl font-semibold">
			<CircleIcon />
			{circle.name}
		</h1>

		<p class="text-lg font-light italic">
			by {circle.owner.name}
			{#if isOwn}
				<span class="font-bold text-danger not-italic">(You)</span>
			{/if}
		</p>

		{#if !isAtRoot}
			<div class="mt-4 flex flex-wrap items-center gap-4">
				{#if !isAtRoot}
					<a title="Go Back" href="/circles/{circle.id}">
						<CircleArrowLeftIcon />
					</a>
				{/if}
			</div>
		{/if}
	</div>

	<div class="h-full w-full">
		{@render children()}
	</div>
</div>
