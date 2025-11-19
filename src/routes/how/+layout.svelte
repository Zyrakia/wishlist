<script lang="ts">
	import { ArrowLeftIcon } from '@lucide/svelte';

	let { data, children } = $props();
</script>

{#if data.return}
	<div class="border-b border-border p-4">
		<a href={data.return} class="button flex w-max gap-2">
			<ArrowLeftIcon size={20} />
			Go Back
		</a>
	</div>
{/if}

{@render children()}
