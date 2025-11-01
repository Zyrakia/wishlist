<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import { createWishlist } from '$lib/remotes/wishlist.remote';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { WishlistSchema } from '$lib/schemas/wishlist';

	const remote = createWishlist.preflight(WishlistSchema);
</script>

<div class="flex-1 p-6 py-12 md:p-12 flex md:items-center justify-center md:justify-start">
	<form
		{...remote}
		class="container mt-6 w-full flex flex-col gap-5 rounded"
		oninput={() => remote.validate({ preflightOnly: true })}
	>
		<InputGroup label="Name" error={remote.fields.name.issues()}>
			{#snippet control()}
				<input
					class="bg-white"
					placeholder="Enter wishlist name"
					{...remote.fields.name.as('text')}
				/>
			{/snippet}
		</InputGroup>

		<InputGroup label="URL" error={remote.fields.slug.issues()}>
			{#snippet control()}
				<input
					class="bg-white"
					placeholder="Enter wishlist URL slug"
					{...remote.fields.slug.as('text')}
				/>
			{/snippet}
		</InputGroup>

		<InputGroup label="Description" error={remote.fields.description.issues()}>
			{#snippet control()}
				<textarea
					{...remote.fields.description.as('text')}
					class="w-full bg-white"
					rows={5}
					placeholder="Enter a short description of the wishlist"
				>
				</textarea>
			{/snippet}
		</InputGroup>

		<button
			class="bg-emerald-200 px-6 py-3 font-bold transition-colors"
			disabled={!!remote.pending}
			{...remote.buttonProps}
		>
			Create List
		</button>
	</form>
</div>
