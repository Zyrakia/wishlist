<script lang="ts">
	import '$lib/assets/app.css';

	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/header.svelte';
	import { untrack } from 'svelte';

	let { children, data } = $props();

	let theme = $derived(data.savedTheme);
	let changingTheme = $state(false);

	const meta = $derived({
		'title': 'Wishii',
		'description': 'Create a wishlist fast and share it to your friends with one short link!',
		'og:type': 'website',
		'og:url': `${page.url.origin}${page.url.pathname}`,
		...page.data.meta,
	});

	$effect(() => {
		untrack(() => {
			if (!changingTheme) {
				changingTheme = true;
				setTimeout(() => (changingTheme = false), 500);
			}
		});

		document.documentElement.dataset.theme = theme;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap"
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
		<Header {theme} user={data.user} />
	{/if}
</div>
