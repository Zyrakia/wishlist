<script>
	import { deleteCircle } from '$lib/remotes/circle.remote';

	let { data } = $props();
</script>

<form {...deleteCircle} class="flex h-full w-full flex-col items-center justify-center">
	<input {...deleteCircle.fields.confirm.as('hidden', 'true')} />

	<p class="mb-4 text-center">
		Are you sure you want to delete <span class="font-bold">{data.circle.name}</span>
	</p>

	<div class="flex justify-center gap-4">
		<button tabindex="0" class="bg-danger dark:text-accent-fg" {...deleteCircle.buttonProps}>
			Delete
		</button>

		<a class="button" href="/circles/{data.circle.id}"> Cancel</a>
	</div>
</form>
