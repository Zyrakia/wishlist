import type { RemoteFormIssue } from '@sveltejs/kit';

type IssuePickable =
	| undefined
	| string
	| string[]
	| { message: string }
	| { issues: () => IssuePickable }
	| IssuePickable[];

/**
 * Attempts to the first issue message out of the given input.
 *
 * @param input an issue message, an array of issue messages or an object that has issues.
 * @return the first issue, if it can be derived form the input
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
 * formatted with it's path (if applicable).
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

const formatIssue = (issue: RemoteFormIssue) => {
	if (issue.path.length === 0) return issue.message;
	return `@${formatIssuePath(issue.path)}: ${issue.message}`;
};

/**
 * From a remote form `fields` entry, pick the first issue and return it
 * formatted with it's path (if applicable).
 *
 * @param fields the remote form fields property
 * @return the first picked issue
 */
export const formatFirstIssue = (fields: { allIssues: () => RemoteFormIssue[] | undefined }) => {
	const issues = fields.allIssues();
	if (!issues?.length) return;

	return formatIssue(issues[0]!);
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

	return issues.map(formatIssue).join('\n');
};
