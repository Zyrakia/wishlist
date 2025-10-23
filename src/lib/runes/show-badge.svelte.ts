import { badgeContext } from '$lib/context/badge';
import { onMount } from 'svelte';

export const showBadge = (value: string) => {
	const { addBadge, removeBadge } = badgeContext.get();
	const id = `${Math.floor(Math.random() * 100)}`;

	onMount(() => {
		addBadge(id, value);
		return () => removeBadge(id);
	});
};
