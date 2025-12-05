<script>
	import { deleteGroup } from '$lib/remotes/group.remote.js';

	let { data } = $props();
</script>

<form {...deleteGroup} class="flex h-full w-full flex-col items-center justify-center">
	<input {...deleteGroup.fields.confirm.as('hidden', 'true')} />

	<p class="mb-4 text-center">
		Are you sure you want to delete <span class="font-bold">{data.group.name}</span>
	</p>

	<div class="flex justify-center gap-4">
		<button tabindex="0" class="bg-danger dark:text-accent-fg" {...deleteGroup.buttonProps}>
			Delete
		</button>

		<a class="button" href="/groups/{data.group.id}"> Cancel</a>
	</div>
</form>
