<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import Loader from '$lib/components/loader.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import { generateItems } from '$lib/remotes/item.remote';

	$inspect(generateItems.result);

	type Candidates = {
		valid: boolean;
		name?: string | undefined;
		imageUrl?: string | undefined;
		price?: number | undefined;
		priceCurrency?: string | undefined;
	}[];

	const resultHistory: Candidates[] = $state([]);
</script>

<div class="flex flex-col gap-4 p-4">
	<form {...generateItems} class="flex flex-col gap-3">
		<InputGroup
			label="URL"
			error={generateItems.fields.url.issues() || generateItems.fields.issues()}
		>
			{#snippet control()}
				<input {...generateItems.fields.url.as('text')} placeholder="External URL" />
			{/snippet}
		</InputGroup>

		{#if generateItems.pending}
			<div class="grid size-6 place-items-center">
				<Loader />
			</div>
		{/if}

		<button
			class="bg-success text-accent-fg"
			disabled={!!generateItems.pending}
			{...generateItems.buttonProps.enhance(async ({ submit }) => {
				await submit();
				const res = generateItems.result;
				if (res) resultHistory.push(res.candidates);
			})}
		>
			Submit
		</button>
	</form>

	<div class="flex flex-col gap-x-4 divide-y divide-accent">
		{#each resultHistory as result}
			<div class="mb-4">
				{#if !result.length}
					<p class="font-light text-danger italic">No products found...</p>
				{:else}
					<div class="mb-4 grid grid-cols-3 gap-3">
						{#each result as candidate}
							<WishlistItem item={candidate} />
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
