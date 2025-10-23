<script lang="ts">
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import { deleteItem } from '$lib/remotes/item.remote.js';

	const { data } = $props();
</script>

<div class="container">
	<WishlistItem interactive={false} item={data.item} />

	<form {...deleteItem}>
		<input {...deleteItem.fields.wishlistSlug.as('hidden', data.wishlist.slug)} />
		<input {...deleteItem.fields.itemId.as('hidden', data.item.id)} />
		<input {...deleteItem.fields.confirm.as('hidden', 'true')} />

		<p class="confirm-message">
			Are you sure you want to delete <span class="item-name">{data.item.name}</span>
		</p>

		<div class="controls">
			<button tabindex="0" class="button confirm" {...deleteItem.buttonProps}>Delete</button>
			<a class="button" href="/{data.wishlist.slug}">Cancel</a>
		</div>
	</form>
</div>

<style>
	.container {
		padding: 1rem;

		width: 100%;
		height: 100%;

		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
	}

	@media (max-width: 800px) {
		.container {
			flex-direction: column;
		}
	}

	.confirm-message {
		text-align: center;
		margin-bottom: 1rem;
	}

	.item-name {
		font-weight: bold;
	}

	.controls {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.button {
		outline: none;
		border: none;
		padding: 0.5rem 0.7rem;
		border-radius: 5px;
		cursor: pointer;

		background-color: whitesmoke;
		border: 1px solid black;
	}

	.button:focus {
		border: 1px solid black;
	}

	.button:hover,
	.button:active {
		filter: brightness(0.9);
	}

	.confirm {
		background-color: #f09393;
	}
</style>
