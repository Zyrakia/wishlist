<script lang="ts">
	import { page } from '$app/state';
	import InputGroup from '$lib/components/input-group.svelte';
	import WishlistConnection from '$lib/components/wishlist-connection.svelte';
	import WishlistEditor from '$lib/components/wishlist-editor.svelte';
	import { createWishlistConnection } from '$lib/remotes/connection.remote';
	import { updateWishlist } from '$lib/remotes/wishlist.remote';
	import { WishlistConnectionSchema } from '$lib/schemas/connection';
	import { WishlistSchema } from '$lib/schemas/wishlist';
	import { asIssue } from '$lib/util/pick-issue';
	import { cleanBaseName } from '$lib/util/url.js';
	import { BadgeQuestionMarkIcon } from '@lucide/svelte';

	let { data } = $props();

	const connections = $derived(data.wishlist.connections);
	const connectionHandler = createWishlistConnection.preflight(WishlistConnectionSchema);

	const connectionIssue = $derived(asIssue(connectionHandler.fields.issues()));

	let connectionProviderName = $derived.by(() => {
		const url = connectionHandler.fields.url.value();
		try {
			return cleanBaseName(new URL(url));
		} catch {
			return '';
		}
	});
</script>

<div class="grid h-full grid-cols-1 place-items-center gap-4 py-6 lg:grid-cols-2 lg:px-4">
	<div class="grid w-full place-items-center lg:h-full">
		<WishlistEditor
			handler={updateWishlist.preflight(WishlistSchema.partial())}
			init={data.wishlist}
		/>
	</div>

	<div class="float-container m-0 p-8 lg:h-full">
		<h1 class="w-full text-2xl font-bold">Manage Connections</h1>
		<hr />

		<div class="mt-3 flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<h2 class="font-bold">Active Connections</h2>

				{#if connections.length}
					<ul class="flex flex-col gap-2 divide-y divide-border/50">
						{#each connections as connection}
							<li class="w-full pb-2">
								<WishlistConnection
									{connection}
									syncing={data.syncingConnectionIds.includes(connection.id)}
									manage
								/>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-text-muted italic">
						You have no active connections.
						<br />
						Connections can be used to sync a list of items on any website to your Wishii
						list.
					</p>

					<a
						href="/how/connect-amazon?return={encodeURIComponent(page.url.pathname)}"
						class="button flex items-center gap-2 p-2 text-accent"
					>
						<BadgeQuestionMarkIcon class="shrink-0 text-success" />

						<div>
							Learn how to connect your <span class="font-bold text-warning">
								Amazon
							</span>
							list!
						</div>
					</a>
				{/if}
			</div>

			<form
				{...connectionHandler}
				class="flex flex-col gap-2 border-t border-border pt-4"
				oninput={() => connectionHandler.validate()}
			>
				<InputGroup label="Name" error={connectionHandler.fields.name.issues()}>
					{#snippet control()}
						<input
							{...connectionHandler.fields.name.as('text')}
							placeholder="My Other Wishlist"
						/>
					{/snippet}
				</InputGroup>

				<InputGroup label="Link" error={connectionHandler.fields.url.issues()}>
					{#snippet control()}
						<input {...connectionHandler.fields.url.as('text')} />
					{/snippet}
				</InputGroup>

				<input
					{...connectionHandler.fields.provider.as('text')}
					hidden
					value={connectionProviderName}
				/>

				<button {...connectionHandler.buttonProps} class="mt-2 bg-success text-accent-fg">
					Create Connection
				</button>

				{#if connectionIssue}
					<p class="text-danger">{connectionIssue}</p>
				{/if}
			</form>
		</div>
	</div>
</div>
