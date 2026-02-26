<script lang="ts">
	import DOMPurify from 'dompurify';
	import { Marked, Renderer } from 'marked';

	interface Props {
		content: string;
	}

	const { content }: Props = $props();

	const renderer = new Renderer();
	renderer.link = ({ href, text }) => {
		if (href?.startsWith('/')) {
			return `<a href="${href}">${text}</a>`;
		}
		return text;
	};

	const marked = new Marked({ renderer, async: false });
	const rendered = $derived(DOMPurify.sanitize(marked.parse(content, { async: false })));
</script>

<div class="markdown">
	{@html rendered}
</div>

<style>
	.markdown :global(strong) {
		font-weight: 600;
		color: var(--color-accent);
	}

	.markdown :global(a) {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.markdown :global(a:hover) {
		color: var(--color-accent);
	}

	.markdown :global(ul),
	.markdown :global(ol) {
		margin-left: 1.25rem;
	}

	.markdown :global(ul) {
		list-style-type: disc;
	}

	.markdown :global(ol) {
		list-style-type: decimal;
	}
</style>
