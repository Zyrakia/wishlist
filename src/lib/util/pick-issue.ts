/**
 * Attempts to pick an issue message out of the given input.
 *
 * @param input an issue message, an array of issue messages or an object that returns issues.
 * @param at the index at which to pick an issue, if the input is an array, default `0`
 * @return the picked issue, if there is one
 */
export const asIssue = (
	input?: string | { message: string }[] | { issues: () => { message: string }[] | undefined },
	at = 0,
): string | undefined => {
	if (!input) return;

	if (typeof input === 'string') return input;
	if ('issues' in input) return asIssue(input.issues());
	else if (input.length) return input[at]?.message;
};
