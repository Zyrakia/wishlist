<script lang="ts">
	let { wishlistSlug, itemId }: { wishlistSlug: String; itemId: string } = $props();
</script>

<div class="container">
	<a class="button edit" href="/{wishlistSlug}/item/edit/{itemId}">✎ &ThickSpace; Edit</a>
	<a class="button delete" href="/{wishlistSlug}/item/delete/{itemId}">🗑️ &ThickSpace; Delete</a>
</div>

<style>
	.container {
		padding-top: 0.25rem;

		display: flex;
		gap: 1rem;
	}

	.button {
		width: 100%;

		border: 2px solid slategray;
		border-radius: 6px;

		background: white;

		padding: 0.5rem;
		text-align: center;
	}

	.button:hover {
		filter: brightness(0.95);
	}

	.edit {
		background-color: #cefafe;
		border-top-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.delete {
		border-top-right-radius: 0;
		border-bottom-left-radius: 0;
		background-color: #ffc9c9;
	}
</style>
