<script lang="ts">
	import { browser } from '$app/environment';
	import { navigating, page } from '$app/state';
	import '$lib/assets/app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setSavedTheme } from '$lib/remotes/theme.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { DefaultTheme } from '$lib/util/theme.js';

	import { SquareUserIcon, LogInIcon, HouseIcon, SunIcon, MoonIcon } from '@lucide/svelte';
	import { onDestroy, untrack } from 'svelte';

	let { children, data } = $props();

	const hasJs = useHasJs();

	let theme = $state(data.savedTheme || DefaultTheme);
	let changingTheme = $state(false);

	const meta = $derived({
		'title': 'Wishii',
		'description': 'Create a wishlist fast and share it to your friends with one short link!',
		'og:type': 'website',
		'og:url': `${page.url.origin}${page.url.pathname}`,
		...page.data.meta,
	});

	$effect(() => void (theme = data.savedTheme || DefaultTheme));
	$effect(() => void (document.documentElement.dataset.theme = theme));

	let navAnimating = $state(false);
	let navAnimPerc = $state(0);
	let navAnimOrigin: 'left' | 'right' = $state('left');

	let navAnimStepper: ReturnType<typeof setInterval> | undefined;
	let navAnimFinisher: ReturnType<typeof setTimeout> | undefined;
	const startNavigation = () => {
		resetNavigation();
		navAnimating = true;
		requestAnimationFrame(() => (navAnimPerc = 0.9));
	};

	const finishNavigation = () => {
		clearInterval(navAnimStepper);
		requestAnimationFrame(() => (navAnimPerc = 1));

		clearInterval(navAnimFinisher);
		navAnimFinisher = setTimeout(() => {
			navAnimOrigin = 'right';
			requestAnimationFrame(() => (navAnimPerc = 0));
			setTimeout(resetNavigation, 400);
		}, 300);
	};

	const resetNavigation = () => {
		navAnimating = false;
		navAnimPerc = 0;
		navAnimOrigin = 'left';

		clearInterval(navAnimStepper);
		clearTimeout(navAnimFinisher);
		navAnimStepper = undefined;
		navAnimFinisher = undefined;
	};

	$effect(() => {
		if (navigating.to) untrack(startNavigation);
		else if (navAnimating) untrack(finishNavigation);
	});

	onDestroy(() => {
		if (!browser) return;
		resetNavigation();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
		rel="stylesheet"
	/>

	{#if meta?.title}
		<title>{meta.title}</title>
		<meta name="title" content={meta.title} />
		<meta name="og:title" content={meta.title} />
		<meta name="twitter:title" content={meta.title} />
	{/if}

	{#if meta?.description}
		<meta name="description" content={meta.description} />
		<meta name="og:description" content={meta.description} />
		<meta name="twitter:description" content={meta.description} />
	{/if}

	{#if meta?.canonical}
		<link rel="canonical" href={meta.canonical} />
	{/if}

	{#each Object.entries(meta) as [name, content]}
		{#if name !== 'title' && name !== 'description' && name !== 'canonical'}
			<meta {name} {content} />
		{/if}
	{/each}
</svelte:head>

<div
	class="grid min-h-dvh grid-rows-[1fr_auto] md:grid-rows-[auto_1fr]"
	class:*:transition-colors={changingTheme}
	class:*:duration-300={changingTheme}
	data-theme={theme}
>
	<main class="row-start-1 md:row-start-2">
		{@render children()}
	</main>

	{#if page.data.showHeader !== false}
		<header
			class="sticky bottom-0 z-50 row-start-2 flex h-auto min-h-16 w-full items-center gap-2 border-t border-border bg-surface p-4 drop-shadow-md md:top-0 md:row-start-1 md:border-t-0 md:border-b"
		>
			<div
				class="fixed top-0 left-0 h-0.5 w-full bg-accent transition-transform will-change-transform md:top-full"
				style="transform-origin: {navAnimOrigin}; transform: scaleX({navAnimPerc})"
			></div>

			<div class="flex w-full flex-wrap items-center justify-between gap-6">
				{#if !(page.url.pathname === '/')}
					<a class="flex items-center gap-2 transition-colors hover:text-accent" href="/">
						<HouseIcon />
						Go Home
					</a>
				{:else}
					<p class="font-semibold">Wishii</p>
				{/if}

				<div class="flex gap-6">
					{#if hasJs()}
						<button
							disabled={changingTheme}
							class="border-0 p-2"
							onclick={async () => {
								changingTheme = true;

								const oldTheme = theme;
								const nextTheme = oldTheme === 'dark' ? 'light' : 'dark';
								try {
									theme = nextTheme;
									await setSavedTheme({ theme: nextTheme });
								} catch (err) {
									theme = oldTheme;
								} finally {
									changingTheme = false;
								}
							}}
						>
							{#if theme === 'light'}
								<SunIcon />
							{:else}
								<MoonIcon />
							{/if}
						</button>
					{/if}

					{#if data.user}
						<a
							href="/account"
							class="flex items-center gap-2 truncate transition-colors hover:text-accent"
						>
							<SquareUserIcon />

							{data.user.name}
						</a>
					{:else}
						<a
							href="/login"
							class="flex items-center gap-2 transition-colors hover:text-accent"
						>
							Login

							<LogInIcon />
						</a>
					{/if}
				</div>
			</div>
		</header>
	{/if}
</div>
