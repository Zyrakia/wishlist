<script lang="ts">
	import { formEdit, type FormEditHandler } from '$lib/actions/form-edit';
	import { pageScroll } from '$lib/actions/page-scroll';
	import { generateItem, updateItem, type createItem } from '$lib/remotes/item.remote';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { ItemSchema, RequiredUrlSchema, type Item } from '$lib/schemas/item';
	import { asIssue } from '$lib/util/pick-issue';
	import { safePrune } from '$lib/util/safe-prune';
	import { onMount } from 'svelte';
	import z from 'zod';
	import Loader from './loader.svelte';
	import WishlistItem from './wishlist-item.svelte';
	import InputGroup from './input-group.svelte';
	import {
		ArrowLeftFromLineIcon,
		CheckIcon,
		GlobeIcon,
		LinkIcon,
		Settings2Icon,
		XIcon,
	} from '@lucide/svelte';
	import { readMetadata } from '$lib/remotes/meta.remote';

	let {
		handler,
		init,
		generate = true,
	}: {
		handler: typeof createItem | typeof updateItem;
		init?: Partial<Item>;
		generate: boolean;
	} = $props();

	const hasJs = useHasJs();

	let pageHasScroll = $state(false);
	let loading = $state(false);

	const generalIssue = $derived(asIssue(handler.fields.issues()));
	// SEE: https://github.com/sveltejs/kit/issues/14802
	// Prevent generation value from persisting
	const generateRemote = generateItem
		.preflight(z.object({ url: RequiredUrlSchema }))
		.for(hasJs() ? crypto.randomUUID() : 1);

	let formMirror: Partial<Item> = $state({});
	const hasMirror = $derived(!!Object.keys(formMirror).length);

	let mode: 'generate' | 'generate-confirm' | 'form' = $state(
		generateRemote.result ? 'generate-confirm' : generate ? 'generate' : 'form',
	);

	const isInputLinkGenerated = $derived.by(() => {
		const inputUrl = generateRemote.fields.url.value();
		const previewUrl = formMirror.url;

		return previewUrl && previewUrl === inputUrl;
	});

	const showPreview = $derived.by(() => {
		if (mode === 'generate-confirm') return true;
		if (!hasJs()) return false;

		if (loading) return true;
		if (mode === 'form') return hasMirror;
		return isInputLinkGenerated && hasMirror;
	});

	const safeUpdateMirror = (key: keyof Item, rawValue: unknown) => {
		const schema = ItemSchema.shape[key];

		const res = schema.safeParse(rawValue);
		if (res.success) {
			if (res.data === undefined) delete formMirror[key];
			else (formMirror[key] as any) = res.data;
		}
	};

	const seed = (props?: Partial<Item>) => {
		if (!props) return;

		const cleanProps = safePrune(ItemSchema, props);
		handler.fields.set(cleanProps as any);
		formMirror = safePrune(ItemSchema, handler.fields.value());
	};

	const onInput: FormEditHandler = (name, value) => {
		if (!(name in ItemSchema.shape)) return;

		const key = name as keyof Item;

		safeUpdateMirror(key, value);
		handler.validate({ preflightOnly: true });
	};

	const submitButtonProps = handler.buttonProps.enhance(async ({ submit }) => {
		await submit();
		generateRemote.fields.url.set('');
	});

	const seedProperties = { ...(generateRemote.result || {}), ...(init || {}) };
	seed(seedProperties);

	onMount(() => {
		handler.validate();
		if (generate) generateRemote.validate();
	});

	let loadStep = $state(0);
	let isGenFailExpected = $state(false);
	let loadFavicon = $state('');
	let loadTitle = $state('');

	const applyLoadMetadata = async (url: string) => {
		try {
			const response = await readMetadata(url);
			loadFavicon = response.favicon;
			loadTitle = response.title;
		} catch (error) {
			try {
				const urlObject = new URL(url);
				loadTitle = urlObject.hostname.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
			} catch (err) {
				console.warn(err);
				loadTitle = 'Unknown Page';
			}

			console.warn(error);
			isGenFailExpected = true;
			loadFavicon = '';
		}
	};
</script>

<div
	use:pageScroll={(_, hasScroll) => (pageHasScroll = hasScroll)}
	class:has-scroll={pageHasScroll}
	class="flex h-full min-h-full w-full flex-col xl:flex-row"
>
	{#if showPreview}
		<aside
			class="pane {mode === 'generate-confirm'
				? 'flex-8/12'
				: 'flex-4/12'} grid place-items-center bg-background p-4 px-6"
		>
			<div class="snap relative w-full max-w-2xl rounded-xl bg-surface p-4 shadow-md">
				<h3 class="text-lg font-bold">Preview</h3>

				{#if loading}
					<div class="flex h-32 w-full flex-col items-center justify-center gap-4">
						<Loader />

						<div class="flex flex-col items-center justify-center gap-2">
							<p class="flex items-center gap-2 text-text-muted">
								{#if loadStep === 0}
									Retrieving page...
								{:else if loadStep === 1}
									Reading page...
								{:else if isGenFailExpected}
									Attempting Generation...
								{:else if loadStep === 2}
									Generating product...
								{:else if loadStep === 3}
									Finishing up...
								{:else}
									<br />
								{/if}
							</p>

							{#if loadTitle}
								<div class="flex justify-center gap-2">
									{#if loadFavicon}
										<img
											src={loadFavicon}
											class="aspect-square w-6"
											alt="{loadTitle} Page Icon"
										/>
									{:else}
										<GlobeIcon />
									{/if}

									<p class="max-w-xs overflow-hidden text-nowrap text-ellipsis">
										{loadTitle}
									</p>
								</div>
							{/if}
						</div>

						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full w-0 bg-accent duration-500"
								style="transition-property: width; width: {Math.max(
									0,
									Math.min(100, 33.33 * loadStep - 1),
								)}%"
							></div>
						</div>
					</div>
				{:else}
					<div
						class="grid w-full place-items-center rounded border border-dashed border-accent/50 p-4"
					>
						<WishlistItem item={formMirror} interactive={false} />
					</div>
				{/if}
			</div>
		</aside>
	{/if}

	<section
		class:border-t={showPreview}
		class="flex items-center justify-center border-dashed border-border bg-background drop-shadow-2xl xl:border-t-0 xl:border-l xl:border-solid {showPreview
			? 'flex-8/12 drop-shadow-none'
			: 'h-full w-full'}"
	>
		{#if mode === 'generate-confirm' || mode === 'form'}
			<form
				{...handler}
				use:formEdit={onInput}
				class="float-container flex flex-col gap-4 p-8 {showPreview
					? 'xl:m-0 xl:h-full xl:max-w-full'
					: ''}"
			>
				<div class:hidden={mode !== 'form'} class="flex flex-col gap-4">
					<InputGroup label="Name" error={handler.fields.name.issues()}>
						{#snippet control()}
							<input required {...handler.fields.name.as('text')} />
						{/snippet}
					</InputGroup>

					<InputGroup label="Notes" error={handler.fields.notes.issues()}>
						{#snippet control()}
							<textarea rows="6" {...handler.fields.notes.as('text')}></textarea>
						{/snippet}
					</InputGroup>

					<div class="flex flex-col gap-x-2 gap-y-4 lg:flex-row">
						<div class="flex-3/5">
							<InputGroup label="Price" error={handler.fields.price.issues()}>
								{#snippet control()}
									<input {...handler.fields.price.as('text')} />
								{/snippet}
							</InputGroup>
						</div>

						<div class="flex-2/5">
							<InputGroup
								label="Currency"
								error={handler.fields.priceCurrency.issues()}
							>
								{#snippet control()}
									<datalist id="currency-list">
										<option value="USD">USD ($)</option>
										<option value="EUR">EUR (€)</option>
										<option value="GBP">GBP (£)</option>
										<option value="JPY">JPY (¥)</option>
										<option value="AUD">AUD ($)</option>
										<option value="CAD">CAD ($)</option>
										<option value="CNY">CNY (¥)</option>
										<option value="INR">INR (₹)</option>
										<option value="MXN">MXN ($)</option>
									</datalist>

									<input
										{...handler.fields.priceCurrency.as('text')}
										list="currency-list"
										autocomplete="off"
									/>
								{/snippet}
							</InputGroup>
						</div>
					</div>

					<InputGroup label="Purchase Link" error={handler.fields.url.issues()}>
						{#snippet control()}
							<input {...handler.fields.url.as('text')} />
						{/snippet}
					</InputGroup>

					<InputGroup label="Image Link" error={handler.fields.imageUrl.issues()}>
						{#snippet control()}
							<input {...handler.fields.imageUrl.as('text')} />
						{/snippet}
					</InputGroup>
				</div>

				{#if mode === 'form'}
					{#if generalIssue}
						<p class="text-danger">{generalIssue}</p>
					{/if}

					<div class="flex gap-2">
						{#if generate !== false}
							<svelte:element
								this={hasJs() ? 'button' : 'a'}
								href="./generate"
								class="button w-max bg-danger text-center dark:text-accent-fg"
								onclick={() => (mode = 'generate')}
								type="button"
								role="button"
								tabindex="0"
								title="Back to Generate"
							>
								<ArrowLeftFromLineIcon />
							</svelte:element>
						{/if}

						<button
							class="flex-1 bg-success font-bold text-accent-fg"
							{...submitButtonProps}
						>
							Submit
						</button>
					</div>
				{:else}
					<div class="flex h-full w-full flex-col items-center justify-center gap-6">
						<h1 class="text-2xl">Is this right?</h1>

						<div class="flex flex-col gap-x-4 gap-y-2 md:flex-row">
							<button
								class="flex items-center gap-2 bg-success text-accent-fg"
								{...submitButtonProps}
							>
								<CheckIcon />
								Add to List
							</button>

							<button
								type="submit"
								formaction="./create"
								formmethod="get"
								class="button flex items-center gap-2 bg-accent dark:text-accent-fg"
								onclick={() => (mode = 'form')}
							>
								<Settings2Icon />
								Edit
							</button>

							<svelte:element
								this={hasJs() ? 'button' : 'a'}
								href="./generate"
								class="button flex items-center gap-2 bg-danger dark:text-accent-fg"
								onclick={() => (mode = 'generate')}
								type="button"
								role="button"
								tabindex="0"
							>
								<XIcon />
								Go Back
							</svelte:element>
						</div>
					</div>
				{/if}
			</form>
		{:else if mode === 'generate'}
			<form
				{...generateRemote}
				oninput={() => generateRemote.validate()}
				class="float-container flex h-full flex-col gap-1 p-8 sm:h-max"
			>
				<h1 class="text-2xl font-bold">Create a new Item</h1>

				<hr class="mb-4" />

				<div class="flex flex-1 flex-col justify-center">
					<div class="flex flex-col gap-4 rounded">
						<InputGroup
							label="Generate From Link"
							error={generateRemote.fields.url.issues() ||
								generateRemote.fields.issues()}
						>
							{#snippet control()}
								<div class="flex items-center gap-4 py-0.5">
									<LinkIcon />
									<input
										{...generateRemote.fields.url.as('text')}
										placeholder="Enter a product page URL"
										class="w-full"
									/>
								</div>
							{/snippet}
						</InputGroup>

						<div class="mt-2 flex w-full justify-stretch gap-4">
							<button
								disabled={loading}
								{...generateRemote.buttonProps.enhance(async ({ submit }) => {
									if (generateRemote.fields.url.issues()) return;

									loading = true;
									loadStep = 0;

									try {
										const submitPromise = submit().then(
											() => (loading = false),
										);

										const url = generateRemote.fields.url.value();
										if (url) {
											const metaPromise = applyLoadMetadata(url);
											await new Promise((res) => setTimeout(res, 2000));
											await metaPromise;
										}

										loadStep++;
										if (loading)
											await new Promise((res) => setTimeout(res, 3000));

										loadStep++;
										if (loading) await submitPromise;

										loadStep++;
										if (loading)
											await new Promise((res) => setTimeout(res, 500));

										const result = generateRemote.result;
										if (result) {
											seed(result);
											mode = 'generate-confirm';
										}
									} finally {
										loading = false;
										loadTitle = '';
										loadFavicon = '';
									}
								})}
								class="w-full bg-success text-accent-fg"
							>
								{#if isInputLinkGenerated}
									Regenerate
								{:else}
									Generate
								{/if}
							</button>

							{#if isInputLinkGenerated}
								<button
									onclick={() => (mode = 'generate-confirm')}
									disabled={loading}
									class="w-full"
								>
									Review
								</button>
							{/if}
						</div>
					</div>

					<p class="my-5 text-center font-bold">OR</p>

					<svelte:element
						this={hasJs() ? 'button' : 'a'}
						href="./create"
						class="button w-full text-center"
						onclick={() => {
							mode = 'form';
							seed({});
						}}
						type="button"
						role="button"
						tabindex="0"
					>
						Create Manually
					</svelte:element>
				</div>
			</form>
		{/if}
	</section>
</div>

<style>
	.has-scroll .pane {
		display: initial;
	}

	.has-scroll .snap {
		position: sticky;
		top: 2rem;
	}
</style>
