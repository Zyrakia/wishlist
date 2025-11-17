export const clock = $state({ now: new Date() });

$effect.root(() => {
	const interval = setInterval(() => (clock.now = new Date()), 1000);
	return () => clearInterval(interval);
});
