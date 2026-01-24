<script lang="ts">
	import { formEdit, type FormEditHandler } from '$lib/actions/form-edit';
	import { pageScroll } from '$lib/actions/page-scroll';
	import { generateItem, updateItem, createItem } from '$lib/remotes/item.remote';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { ItemSchema, RequiredUrlSchema, type Item } from '$lib/schemas/item';
	import { firstIssue } from '$lib/util/issue';
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
		SparklesIcon,
		XIcon,
	} from '@lucide/svelte';
	import { readMetadata } from '$lib/remotes/meta.remote';

	let {
		handler,
		init,
		generate = true,
		currentState,
	}: {
		handler: typeof createItem | typeof updateItem;
		init?: Partial<Item>;
		generate: boolean;
		currentState?: 'generate' | 'form';
	} = $props();

	const hasJs = useHasJs();

	let pageHasScroll = $state(false);

	const generalIssue = $derived(firstIssue(handler.fields.issues()));
	// SEE: https://github.com/sveltejs/kit/issues/14802
	// Prevent generation value from persisting
	let generateRemote = generateItem
		.preflight(z.object({ url: RequiredUrlSchema }))
		.for(hasJs() ? crypto.randomUUID() : 1);

	let formMirror: Partial<Item> = $state({});
	const hasMirror = $derived(!!Object.keys(formMirror).length);

	const mode = $derived(handler === createItem ? 'create' : 'edit');
	let pageState: 'generate' | 'generate-confirm' | 'form' = $state(
		currentState
			? currentState
			: generateRemote.result
				? 'generate-confirm'
				: generate
					? 'generate'
					: 'form',
	);

	$effect(() => {
		if (currentState) pageState = currentState;
	});

	const isInputLinkGenerated = $derived.by(() => {
		const inputUrl = generateRemote.fields.url.value();
		const previewUrl = formMirror.url;

		return previewUrl && previewUrl === inputUrl;
	});

	const showPreview = $derived.by(() => {
		if (pageState === 'generate-confirm') return true;
		if (!hasJs()) return false;

		if (generating) return true;
		if (pageState === 'form') return hasMirror;
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

	let generating = $state(false);
	let generateStep = $state(0);
	let genFavicon = $state('');
	let genTitle = $state('');

	const generateStepMessages = [
		'Retrieving page',
		'Reading page',
		'Generating Product',
		'Finishing up',
	];

	const applyLoadMetadata = async (url: string) => {
		try {
			const response = await readMetadata(url);
			if (!response) throw new Error('Cannot generate metadata');

			genFavicon = response.favicon || '';
			genTitle = response.title;
		} catch (error) {
			try {
				const urlObject = new URL(url);
				genTitle = urlObject.hostname.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
			} catch (err) {
				console.warn(err);
				genTitle = 'Unknown Page';
			}

			console.warn(error);
			genFavicon = '';
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
			class="pane {pageState !== 'form'
				? 'flex-6/12'
				: 'flex-4/12'} grid place-items-center bg-background p-4 px-6"
		>
			<div class="snap relative w-full max-w-2xl rounded-xl bg-surface p-4 shadow-md">
				<h3 class="text-lg font-bold">Preview</h3>

				{#if generating}
					<div class="flex w-full flex-col items-center justify-center gap-4">
						<div class="size-20">
							<Loader />
						</div>

						<div class="flex w-full flex-col items-center justify-center gap-2">
							<p class="flex items-center gap-2 text-text-muted">
								{#if generateStep < generateStepMessages.length}
									{generateStepMessages[generateStep]}...
								{:else}
									<br />
								{/if}
							</p>

							{#if genTitle}
								<div class="grid max-w-10/12 grid-cols-[max-content_1fr] gap-2">
									{#if genFavicon}
										<img src={genFavicon} class="aspect-square w-6" alt="" />
									{:else}
										<GlobeIcon />
									{/if}

									<p class="truncate">
										{genTitle}
									</p>
								</div>
							{/if}
						</div>

						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full w-0 bg-accent duration-500"
								style="transition-property: width; width: {Math.max(
									0,
									Math.min(100, 33.33 * generateStep - 1),
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
		{#if pageState === 'generate-confirm' || pageState === 'form'}
			<form
				{...handler}
				use:formEdit={onInput}
				class="float-container flex flex-col gap-4 p-8 {showPreview
					? 'xl:m-0 xl:h-full xl:max-w-full'
					: ''}"
			>
				<div class:hidden={pageState !== 'form'} class="flex flex-col gap-4">
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

				{#if pageState === 'form'}
					{#if generalIssue}
						<p class="text-danger">{generalIssue}</p>
					{/if}

					<div class="flex gap-2">
						{#if generate === true}
							<svelte:element
								this={hasJs() ? 'button' : 'a'}
								href="./generate"
								class="button w-max bg-danger text-center dark:text-accent-fg"
								onclick={() => (pageState = 'generate')}
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
					<div class="flex h-full w-full flex-col items-center justify-center gap-6 pb-4">
						<h1 class="text-2xl">Is this right?</h1>

						<div class="flex flex-col gap-x-4 gap-y-2 md:flex-row">
							<div class="relative mb-10 md:mb-0">
								<button
									class="flex items-center gap-2 bg-success text-accent-fg"
									{...submitButtonProps}
								>
									<CheckIcon />

									{#if mode === 'create'}
										Add to List
									{:else}
										Save
									{/if}
								</button>

								<label
									class="absolute top-full mt-2 flex cursor-pointer items-center gap-2 select-none"
								>
									<input
										class="peer hidden"
										{...(handler as typeof createItem).fields.continue.as(
											'checkbox',
										)}
										checked={!!currentState}
									/>

									<span
										class="flex size-4 items-center justify-center rounded border border-border bg-muted *:opacity-0
           peer-checked:border-accent peer-checked:*:opacity-100 peer-focus:ring-2 peer-focus:ring-accent-fg"
									>
										<CheckIcon class="text-accent transition-opacity" />
									</span>

									<span class="text-light text-sm">Keep Adding</span>
								</label>
							</div>

							<button
								type="submit"
								formaction="./create"
								formmethod="get"
								class="button flex items-center gap-2 bg-accent dark:text-accent-fg"
								onclick={() => (pageState = 'form')}
							>
								<Settings2Icon />
								Edit
							</button>

							<svelte:element
								this={hasJs() ? 'button' : 'a'}
								href="./generate"
								class="button flex items-center gap-2 bg-danger dark:text-accent-fg"
								onclick={() => (pageState = 'generate')}
								type="button"
								role="button"
								tabindex="0"
							>
								<XIcon />
							</svelte:element>
						</div>
					</div>
				{/if}
			</form>
		{:else if pageState === 'generate'}
			<form
				{...generateRemote}
				oninput={() => generateRemote.validate()}
				class="float-container flex h-full flex-col gap-1 p-8 sm:h-max"
			>
				<h1 class="text-2xl font-bold">
					{#if mode === 'create'}
						Create a new Item
					{:else}
						Edit Item
					{/if}
				</h1>

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
								disabled={generating}
								{...generateRemote.buttonProps.enhance(async ({ submit }) => {
									if (generateRemote.fields.url.issues()) return;

									generating = true;
									generateStep = 0;

									try {
										let submitComplete = false;
										const submitPromise = submit().then(
											() => (submitComplete = true),
										);

										const url = generateRemote.fields.url.value();
										if (url) {
											const metaPromise = applyLoadMetadata(url);
											await new Promise((res) => setTimeout(res, 2000));
											await metaPromise;
										}

										generateStep++;
										if (!submitComplete)
											await new Promise((res) => setTimeout(res, 1500));

										generateStep++;
										if (!submitComplete) await submitPromise;

										generateStep = generateStepMessages.length - 1;
										await new Promise((res) => setTimeout(res, 500));

										const result = generateRemote.result;
										if (result) {
											seed(result);
											pageState = 'generate-confirm';
										}
									} finally {
										generating = false;
										genTitle = '';
										genFavicon = '';
									}
								})}
								class="flex w-full items-center justify-center gap-3 bg-success text-accent-fg"
							>
								<SparklesIcon size={16} />

								{#if isInputLinkGenerated}
									Regenerate
								{:else}
									Generate
								{/if}

								<SparklesIcon size={16} />
							</button>

							{#if isInputLinkGenerated}
								<button
									onclick={() => (pageState = 'generate-confirm')}
									disabled={generating}
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
							pageState = 'form';
							seed({});
						}}
						type="button"
						role="button"
						tabindex="0"
					>
						{#if mode === 'create'}
							Create Manually
						{:else}
							Edit Manually
						{/if}
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
