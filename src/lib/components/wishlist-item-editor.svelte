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
		LinkIcon,
		Settings2Icon,
		XIcon,
	} from '@lucide/svelte';

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

		if (!hasJs()) return;

		if (mode === 'form') return true;
		if (loading) return true;

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
</script>

<div
	use:pageScroll={(_, hasScroll) => (pageHasScroll = hasScroll)}
	class:has-scroll={pageHasScroll}
	class="min-h-full w-full flex flex-col xl:flex-row"
>
	{#if showPreview}
		<aside
			class="pane {mode === 'generate-confirm'
				? 'flex-8/12'
				: 'flex-4/12'} p-4 px-6 bg-neutral-200 grid place-items-center"
		>
			<div class="snap w-full max-w-2xl relative p-4 rounded-xl bg-white shadow-md">
				<h3 class="text-lg font-bold">Preview</h3>

				{#if loading}
					<div class="w-full h-32">
						<Loader />
					</div>
				{:else}
					<div
						class="w-full border border-dashed border-red-800/50 p-4 rounded grid place-items-center"
					>
						<WishlistItem item={formMirror} interactive={false} />
					</div>
				{/if}
			</div>
		</aside>
	{/if}

	<section
		class:border-t={showPreview}
		class="flex-8/12 bg-neutral-200 drop-shadow-2xl border-black/50 xl:border-t-0 border-dashed xl:border-solid xl:border-l flex justify-center"
	>
		{#if mode === 'generate-confirm' || mode === 'form'}
			<form
				{...handler}
				use:formEdit={onInput}
				class="p-8 m-0 sm:mx-12 sm:my-6 flex flex-col gap-4 max-w-full md:max-w-2xl lg:max-w-4xl {hasJs()
					? 'xl:m-0 xl:max-w-full'
					: 'xl:max-w-6xl'} w-full bg-neutral-100 rounded-lg shadow-xl shadow-black/20"
			>
				<div class:hidden={mode !== 'form'} class="flex flex-col gap-2">
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
						<p class="text-red-500">{generalIssue}</p>
					{/if}

					<div class="flex gap-2">
						{#if generate !== false}
							<svelte:element
								this={hasJs() ? 'button' : 'a'}
								href="./generate"
								class="button text-center w-max bg-red-200"
								onclick={() => (mode = 'generate')}
								type="button"
								role="button"
								tabindex="0"
								title="Back to Generate"
							>
								<ArrowLeftFromLineIcon />
							</svelte:element>
						{/if}

						<button class="flex-1 bg-green-200 font-bold" {...submitButtonProps}
							>Submit</button
						>
					</div>
				{:else}
					<div class="w-full h-full flex flex-col gap-6 items-center justify-center">
						<h1 class="text-2xl">Is this right?</h1>

						<div class="flex gap-y-2 gap-x-4 flex-col md:flex-row">
							<button
								class="flex items-center gap-2 bg-green-200"
								{...submitButtonProps}
							>
								<CheckIcon />
								Add to List
							</button>

							<button
								type="submit"
								formaction="./create"
								formmethod="get"
								class="button flex items-center gap-2 bg-blue-200"
								onclick={() => (mode = 'form')}
							>
								<Settings2Icon />
								Edit
							</button>

							<svelte:element
								this={hasJs() ? 'button' : 'a'}
								href="./generate"
								class="button flex items-center gap-2 bg-red-200"
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
				oninput={() => generateRemote.validate({ preflightOnly: true })}
				class="p-8 m-0 sm:mx-12 sm:my-6 flex flex-col gap-1 max-w-full md:max-w-2xl lg:max-w-4xl xl:max-w-6xl w-full bg-neutral-100 rounded-lg shadow-xl shadow-black/20"
			>
				<h1 class="font-bold text-2xl">Create a new Item</h1>

				<hr class="mb-4" />

				<div class="flex-1 flex flex-col justify-center">
					<p class="font-light italic">Automatically generate from:</p>

					<div
						class="p-3 border rounded border-black/50 border-dashed flex flex-col gap-4"
					>
						<InputGroup
							label="Item Link"
							error={generateRemote.fields.url.issues() ||
								generateRemote.fields.issues()}
						>
							{#snippet control()}
								<div class="flex gap-4 py-0.5 items-center">
									<LinkIcon />
									<input
										{...generateRemote.fields.url.as('text')}
										placeholder="Enter a product page URL"
										class="w-full"
									/>
								</div>
							{/snippet}
						</InputGroup>

						<button
							disabled={loading}
							{...generateRemote.buttonProps.enhance(async ({ submit }) => {
								if (isInputLinkGenerated) {
									mode = 'generate-confirm';
									return;
								}

								loading = true;
								try {
									await submit();
									if (generateRemote.result) {
										seed(generateRemote.result);
										mode = 'generate-confirm';
									}
								} finally {
									loading = false;
								}
							})}
							class="mt-2 bg-green-200"
						>
							{#if isInputLinkGenerated}
								Review
							{:else}
								Generate
							{/if}
						</button>
					</div>

					<p class="font-bold my-auto text-center">OR</p>

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
