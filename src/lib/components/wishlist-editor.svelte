<script lang="ts">
	import { isWishlistSlugOpen, updateWishlist, type createWishlist } from '$lib/remotes/wishlist.remote';
	import { WishlistSchema, type Wishlist } from '$lib/schemas/wishlist';
	import { asIssue } from '$lib/util/pick-issue';
	import { safePrune } from '$lib/util/safe-prune';
	import { onMount, untrack } from 'svelte';
	import InputGroup from './input-group.svelte';
	import { CheckIcon, LinkIcon, XIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import Loader from './loader.svelte';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { fade } from 'svelte/transition';

	let {
		handler,
		init,
	}: {
		handler: typeof createWishlist | typeof updateWishlist;
		init?: Partial<Wishlist>;
	} = $props();

	const hasJs = useHasJs();
	const mode: 'edit' | 'create' = $derived(handler === updateWishlist ? 'edit' : 'create');
	const generalIssue = $derived(asIssue(handler.fields.issues()));

	let isSlugTaken = $state(false);
	const generatedSlug = $derived.by(() => {
		const name = handler.fields.name.value();
		if (!name) return '';

		return name
			.toLowerCase()
			.replaceAll(' ', '-')
			.replace(/[^\_\-a-zA-Z0-9]/gm, '');
	});

	const slugIssue = $derived.by(() => {
		const validationIssues = asIssue(handler.fields.slug);
		if (validationIssues) return validationIssues;
		if (isSlugTaken) return 'Already taken';
	});

	const checkSlug = async () => {
		const slug = handler.fields.slug.value();
		const isOpen =
			(page.params.wishlist_slug && slug === page.params.wishlist_slug) ||
			(await isWishlistSlugOpen({ slug }));
		isSlugTaken = !isOpen;
	};

	let lastGeneratedSlug = $state('');
	const patchSlug = () => {
		const inputSlug = handler.fields.slug.value();
		if (inputSlug?.trim() && inputSlug !== lastGeneratedSlug) return;

		handler.fields.slug.set(generatedSlug);
		lastGeneratedSlug = generatedSlug;

		handler.validate({ preflightOnly: true });
	};

	const seed = (props?: Partial<Wishlist>) => {
		const cleanProps = safePrune(WishlistSchema, props);
		handler.fields.set(cleanProps as any);
	};

	let checkSlugTimeout: NodeJS.Timeout | undefined = $state();
	$effect(() => {
		const slug = handler.fields.slug.value();
		if (slug) {
			checkSlugTimeout = setTimeout(async () => {
				await checkSlug();
				checkSlugTimeout = undefined;
			}, 2000);
		}

		return () => {
			if (checkSlugTimeout) {
				clearTimeout(checkSlugTimeout);
				checkSlugTimeout = undefined;
			}
		};
	});

	$effect(() => {
		untrack(patchSlug);
		lastGeneratedSlug = generatedSlug;
	});

	seed(init);
	onMount(() => handler.validate());
</script>

<div class="w-full min-h-full h-full bg-neutral-200 flex flex-col items-center justify-center">
	<form
		{...handler}
		oninput={() => handler.validate({ preflightOnly: true })}
		class="float-container p-8 flex flex-col gap-4"
	>
		<h1 class="font-bold text-2xl">{mode === 'edit' ? 'Edit' : 'Create'} Wishlist</h1>

		<hr class="-mt-3" />

		<InputGroup label="Name" error={handler.fields.name.issues()}>
			{#snippet control()}
				<input required {...handler.fields.name.as('text')} />
			{/snippet}
		</InputGroup>

		<InputGroup label="Share Link" error={slugIssue}>
			{#snippet control()}
				<div class="w-full flex">
					<span
						class="flex items-center border px-2 border-red rounded rounded-tr-none rounded-br-none"
						>/</span
					>

					<input
						{...handler.fields.slug.as('text')}
						onblur={patchSlug}
						aria-invalid={slugIssue ? 'true' : 'false'}
						value={handler.fields.slug.value()}
						class="flex-1 border-l-0 rounded-tl-none rounded-bl-none"
					/>

					{#if hasJs()}
						<div
							class="ms-2 w-8 flex items-center justify-center"
							title={slugIssue ? 'Link is invalid' : 'Link is valid'}
						>
							{#if checkSlugTimeout}
								<div class="w-full h-full p-1">
									<Loader
										pulseDur="1s"
										pulseCount={2}
										pulseStaggerDur="250ms"
										thickness="2px"
										color="black"
									/>
								</div>
							{:else if slugIssue}
								<XIcon class="text-red-500" />
							{:else}
								<CheckIcon class="text-green-600" />
							{/if}
						</div>
					{/if}
				</div>
			{/snippet}
		</InputGroup>

		<InputGroup label="Description" error={handler.fields.description.issues()}>
			{#snippet control()}
				<textarea rows="6" {...handler.fields.description.as('text')}></textarea>
			{/snippet}
		</InputGroup>

		<button {...handler.buttonProps} class="bg-green-200">
			{mode === 'create' ? 'Submit' : 'Save'}
		</button>

		{#if generalIssue}
			<p
				class="text-sm font-bold text-center w-max bg-red-200 p-2 rounded"
				in:fade={{ duration: 150 }}
				out:fade={{ duration: 150 }}
			>
				{generalIssue}
			</p>
		{/if}
	</form>
</div>
