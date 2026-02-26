import type { RemoteFormIssue } from '@sveltejs/kit';

type IssuePickable =
	| undefined
	| string
	| string[]
	| { message: string }
	| { issues: () => IssuePickable }
	| IssuePickable[];

/**
 * Attempts to get the first issue message out of the given input.
 *
 * @param input an issue message, an array of issue messages or an object that has issues.
 * @return the first issue, if it can be derived from the input
 */
export const firstIssue = (input?: IssuePickable): string | undefined => {
	if (!input) return;

	if (typeof input === 'string') return input;
	if (Array.isArray(input)) return firstIssue(input[0]);
	else if ('message' in input) return input.message;
	else return firstIssue(input.issues());
};

/**
 * From a remote form `fields` entry, pick the first issue and return it
 * formatted with its path (if applicable).
 *
 * @param fields the remote form fields property
 * @return the first picked issue
 */
const formatIssuePath = (path: RemoteFormIssue['path']) => {
	return path
		.map((v, i, arr) => {
			const isArrayIndex = typeof v === 'number';
			const followsNonArrayParent = i !== 0 && typeof arr[i - 1] === 'string';

			const formatted = isArrayIndex ? `[${v}]` : v;
			return followsNonArrayParent ? '.' + formatted : formatted;
		})
		.join('');
};

/**
 * Formats an issue message with a path indicator '@'. The path
 * is properly joined to indicate what part of an object the issue originates at.
 *
 * @param message the issue message
 * @param path the path to the problematic property (['items', 0, 'name'])
 * @return the formatted issue (@items[0].name: <issue>)
 */
export const formatIssue = (message: string, path?: (string | number)[]) => {
	if (!path?.length) return message;
	return `@${formatIssuePath(path)}: ${message}`;
};

/**
 * From a remote form `fields` entry, pick the first issue and return it
 * formatted with its path (if applicable).
 *
 * @param fields the remote form fields property
 * @return the first picked issue
 */
export const formatFirstIssue = (fields: { allIssues: () => RemoteFormIssue[] | undefined }) => {
	const issues = fields.allIssues();
	if (!issues?.length) return;

	const first = issues[0];
	return formatIssue(first.message, first.path);
};

/**
 * From a remote form `fields` entry, get all issues formatted with their
 * paths, one per line.
 *
 * @param fields the remote form fields property
 * @return all issues joined by newlines, or undefined if none
 */
export const formatAllIssues = (fields: { allIssues: () => RemoteFormIssue[] | undefined }) => {
	const issues = fields.allIssues();
	if (!issues?.length) return;

	return issues.map((v) => formatIssue(v.message, v.path)).join('\n');
};
