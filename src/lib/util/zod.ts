import ms from 'ms';
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

/**
 * A zod transformation that wraps the `ms` utility.
 * 
 * @param v the string time value or a millisecond number
 * @param ctx the transformation context
 * @returns the transformed value, if the input could be transformed
 */
export const intoTime = (v: string | number, ctx: z.RefinementCtx) => {
	const input = String(v);

	try {
		const milliseconds = ms(input as ms.StringValue);
		if (isNaN(milliseconds)) {
			ctx.addIssue({code: 'custom', message: 'Not a valid time string or milliseconds value', input});
			return z.NEVER;
		}

		return { milliseconds, seconds: milliseconds / 1000, formatted: ms(milliseconds) }
	} catch {
		ctx.addIssue({ code: 'custom', message: 'Encounteted an error while parsing as time value', input });
		return z.NEVER;
	}
}