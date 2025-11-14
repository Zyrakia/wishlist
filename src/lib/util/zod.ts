import z from 'zod';

/**
 * Returns a zod schema that accepts a string and attempts transforms it into a boolean.
 *
 * The input string is trimmed and lowercased before transformation.
 *
 * @param trueWords a list of lowercase words that will match to `true`
 * @param falseWords a list of lowercase words that will match to `false`
 * @return the generated schema
 */
export const strBoolean = (trueWords = ['yes', 'true'], falseWords = ['no', 'false']) => {
	return z
		.string()
		.trim()
		.toLowerCase()
		.transform((v, ctx) => {
			if (trueWords.includes(v)) return true;
			else if (falseWords.includes(v)) return false;

			ctx.addIssue({ code: 'custom', message: 'Invalid boolean word' });
			return z.NEVER;
		});
};
