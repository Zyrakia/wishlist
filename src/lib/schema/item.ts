import z from 'zod';

const clearEmptyString = (v: any) => {
	if (typeof v === 'string' && v.trim() === '') return;
	return v;
};

export const ItemSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, { error: 'Minimum 2 characters' })
		.max(30, { error: 'Maximum 30 characters' })
		.nonempty('A name is required'),
	notes: z.string().trim().max(250, { error: 'Maximum 250 characters' }).default(''),
	imageUrl: z.preprocess(clearEmptyString, z.url().nullish()),
	url: z.preprocess(clearEmptyString, z.url().nullish()),
	priceCurrency: z.preprocess(
		clearEmptyString,
		z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/, { error: 'Must be exactly 3 letters' })
			.default('USD'),
	),
	price: z.preprocess(
		clearEmptyString,
		z
			.string()
			.trim()
			.or(z.number())
			.nullish()
			.transform((v, ctx) => {
				if (v === undefined || v === null) return;

				const n = Number(v);

				if (isNaN(n)) {
					ctx.addIssue({ code: 'custom', message: 'Not a valid number', input: v });
					return z.NEVER;
				}

				if (n < 0) {
					ctx.addIssue({ code: 'custom', message: 'Cannot be negative', input: n });
					return z.NEVER;
				}

				return n;
			}),
	),
});
