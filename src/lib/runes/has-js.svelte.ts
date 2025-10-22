export const useHasJs = () => {
	let hasJs = $state(false);
	$effect(() => void (hasJs = true));
	return () => hasJs;
};
