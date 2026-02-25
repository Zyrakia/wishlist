<script lang="ts">
	import { SquareUserIcon, LogInIcon, HouseIcon, SunIcon, MoonIcon } from '@lucide/svelte';
	import { setSavedTheme, toggleSavedTheme } from '$lib/remotes/theme.remote.js';
	import { onDestroy, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { navigating, page } from '$app/state';
	import type { Theme } from '$lib/util/theme';
	import type { CookieUser } from '$lib/schemas/auth';
	import { slide } from 'svelte/transition';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import Search from './search/search.svelte';
	import SearchToggle from './search/search-toggle.svelte';
	import { isMobile } from '$lib/runes/media.svelte';

	let { theme, user }: { theme: Theme; user?: CookieUser } = $props();

	const isHome = $derived(page.url.pathname === '/');
	const changingTheme = $derived(!!setSavedTheme.pending);
	const hasJs = useHasJs();

	let navAnimating = $state(false);
	let navAnimPerc = $state(0);
	let navAnimOrigin: 'left' | 'right' = $state('left');

	let searchActive = $state(false);
	let searchFocused = $state(false);

	let navAnimStepper: ReturnType<typeof setInterval> | undefined;
	let navAnimFinisher: ReturnType<typeof setTimeout> | undefined;
	const startNavigation = () => {
		if (isMobile.current) searchActive = false;
		if (navAnimating) return;

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
		if (!isHome) return;
		searchActive = true;
	});

	$effect(() => {
		if (navigating.to) untrack(startNavigation);
		else if (navAnimating) untrack(finishNavigation);
	});

	onDestroy(() => {
		if (!browser) return;
		resetNavigation();
	});
</script>

<header
	class="sticky bottom-0 z-50 row-start-2 flex h-auto min-h-16 w-full items-center gap-2 border-t-2 border-accent/80 bg-surface p-4 md:top-0 md:row-start-1 md:border-t-0 md:border-b md:border-border md:inset-shadow-none md:drop-shadow-md"
>
	<div
		class="fixed top-0 left-0 h-0.5 w-full bg-accent transition-transform will-change-transform md:top-full"
		style="transform-origin: {navAnimOrigin}; transform: scaleX({navAnimPerc})"
	></div>

	<div
		class="grid w-full grid-cols-2 items-center gap-x-6 md:grid-cols-[auto_1fr_auto] {searchActive
			? 'gap-y-2'
			: 'gap-y-0'} md:gap-y-0"
	>
		{#if !isHome}
			<a class="flex items-center gap-2 transition-colors hover:text-accent" href="/">
				<HouseIcon />
				Home
			</a>
		{:else}
			<p class="font-semibold">Wishii</p>
		{/if}

		<div class="flex min-w-0 items-center justify-end gap-2 sm:gap-3 md:order-3 md:gap-6">
			{#if user}
				<SearchToggle
					bind:active={searchActive}
					iconClass="size-5 md:size-6"
					onClick={(active) => {
						if (active) searchFocused = true;
					}}
				/>
			{/if}

			<form {...toggleSavedTheme}>
				<button
					disabled={changingTheme}
					aria-label={theme === 'light'
						? 'Switch to dark theme'
						: 'Switch to light theme'}
					title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
					class="overflow-hidden border-0 p-1.5 md:p-2"
					{...toggleSavedTheme.buttonProps}
				>
					{#if theme === 'light'}
						<div out:slide={{ duration: 150 }} in:slide={{ duration: 150 }}>
							<SunIcon class="size-5 md:size-6" />
						</div>
					{:else}
						<div out:slide={{ duration: 150 }} in:slide={{ duration: 150 }}>
							<MoonIcon class="size-5 md:size-6" />
						</div>
					{/if}
				</button>
			</form>

			{#if user}
				<a
					href="/account"
					aria-label="Account"
					title="Account"
					class="flex min-w-0 items-center gap-1.5 truncate transition-colors hover:text-accent md:gap-2"
				>
					<SquareUserIcon class="size-5 shrink-0 md:size-6" />

					<span class="hidden truncate md:inline">
						{user.name}
					</span>
				</a>
			{:else}
				<a
					href="/login"
					aria-label="Login"
					title="Login"
					class="flex items-center gap-1.5 transition-colors hover:text-accent md:gap-2"
				>
					<span class="hidden md:inline">Login</span>

					<LogInIcon class="size-5 shrink-0 md:size-6" />
				</a>
			{/if}
		</div>

		{#if hasJs() && user}
			<div
				in:slide={{ duration: 200 }}
				class="col-span-2 w-full shrink-0 transition-[max-height,opacity,margin] duration-200 md:order-2 md:col-span-1 md:mt-0 md:max-h-20 md:overflow-visible {searchActive
					? 'mt-2 max-h-32 overflow-visible opacity-100 md:pointer-events-auto'
					: 'pointer-events-none mt-0 max-h-0 overflow-hidden opacity-0 md:max-h-20 md:overflow-visible'}"
			>
				<Search
					bind:searchFocused
					onOpenChange={(open) => {
						if (open === true) searchActive = true;
					}}
				/>
			</div>
		{/if}
	</div>
</header>
