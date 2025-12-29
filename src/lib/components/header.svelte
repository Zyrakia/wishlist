<script lang="ts">
	import { SquareUserIcon, LogInIcon, HouseIcon, SunIcon, MoonIcon } from '@lucide/svelte';
	import { setSavedTheme, toggleSavedTheme } from '$lib/remotes/theme.remote.js';
	import { onDestroy, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { navigating, page } from '$app/state';
	import type { Theme } from '$lib/util/theme';
	import type { CookieUser } from '$lib/schemas/auth';
	import { fade, slide } from 'svelte/transition';

	let { theme, user }: { theme: Theme; user?: CookieUser } = $props();

	const changingTheme = $derived(!!setSavedTheme.pending);

	let navAnimating = $state(false);
	let navAnimPerc = $state(0);
	let navAnimOrigin: 'left' | 'right' = $state('left');

	let navAnimStepper: ReturnType<typeof setInterval> | undefined;
	let navAnimFinisher: ReturnType<typeof setTimeout> | undefined;
	const startNavigation = () => {
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

	<div class="flex w-full flex-wrap items-center justify-between gap-6">
		{#if !(page.url.pathname === '/')}
			<a class="flex items-center gap-2 transition-colors hover:text-accent" href="/">
				<HouseIcon />
				Home
			</a>
		{:else}
			<p class="font-semibold">Wishii</p>
		{/if}

		<div class="flex items-center gap-6">
			<form {...toggleSavedTheme}>
				<button
					disabled={changingTheme}
					class="overflow-hidden border-0 p-2"
					{...toggleSavedTheme.buttonProps}
				>
					{#if theme === 'light'}
						<div out:slide={{ duration: 150 }} in:slide={{ duration: 150 }}>
							<SunIcon />
						</div>
					{:else}
						<div out:slide={{ duration: 150 }} in:slide={{ duration: 150 }}>
							<MoonIcon />
						</div>
					{/if}
				</button>
			</form>

			{#if user}
				<a
					href="/account"
					class="flex items-center gap-2 truncate transition-colors hover:text-accent"
				>
					<SquareUserIcon />

					{user.name}
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
