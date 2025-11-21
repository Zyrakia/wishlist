<script lang="ts">
	import { DefaultTheme } from '$lib/util/theme';

	import HowTo from '$lib/components/how-to.svelte';

	import imageOne from '$lib/assets/amazon-share-1.webp';
	import imageTwo from '$lib/assets/amazon-share-2.webp';

	import imageThreeLight from '$lib/assets/amazon-share-3-light.webp';
	import imageThreeDark from '$lib/assets/amazon-share-3-dark.webp';
	import { InfoIcon } from '@lucide/svelte';
	let { data } = $props();

	const theme = $derived(data.savedTheme || DefaultTheme);
	const imageThree = $derived(theme === 'light' ? imageThreeLight : imageThreeDark);
</script>

{#snippet stepOne()}
	<p class="text-lg text-text-muted">
		Your wishlist <span class="font-bold text-danger">must</span> be shared in order for Wishii to
		see it!
	</p>
{/snippet}

{#snippet stepTwo()}
	<p class="text-lg text-text-muted">
		You must share your wishlist as

		<br />

		"<span class="font-semibold text-danger">VIEW ONLY</span>"
	</p>
{/snippet}

{#snippet stepThree()}
	<p class="text-lg text-text-muted">
		Enter a name for your connection

		<br />

		Example: "<span class="font-bold text-success">Amazon Wishlist</span>"

		<br />
		<br />

		Then, paste the link that you copied earlier.
		<br />
		Finally, click <span class="font-bold">[ Create Connection ]</span>.
	</p>
{/snippet}

<div class="p-4">
	<HowTo
		steps={[
			{
				title: 'Share your Amazon Wishlist',
				description: stepOne,
				image: imageOne,
			},
			{
				title: 'Copy your Wishlist Link',
				description: stepTwo,
				image: imageTwo,
			},
			{
				title: 'Choose a Name and Connect',
				description: stepThree,
				image: imageThree,
			},
		]}
	/>

	<p class="flex items-center gap-4 border-t border-border py-6 text-lg">
		<InfoIcon class="shrink-0 text-accent" size={32} />

		Connections are updated automatically whenever someone visits your Wishlist (max once per
		day), or when you update them manually in your wishlist settings.

		<br />
		<br />

		The sync process may take up to 30 seconds.
	</p>
</div>
