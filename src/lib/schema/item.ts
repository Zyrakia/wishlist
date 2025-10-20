import z from 'zod';

const emptyStringAsUndefined = (v: any) => {
	if (typeof v === 'string' && v.trim() === '') return;
	return v;
};

export const ItemSchema = z.object({
	name: z.string().trim().nonempty('A name is required'),
	notes: z.string().trim().default(''),
	imageUrl: z.preprocess(emptyStringAsUndefined, z.url().optional()),
	url: z.preprocess(emptyStringAsUndefined, z.url().optional()),
	priceCurrency: z.preprocess(
		emptyStringAsUndefined,
		z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/, { error: 'Must be exactly 3 characters' })
			.default('USD'),
	),
	price: z
		.string()
		.trim()
		.or(z.number().nonnegative())
		.optional()
		.transform((v, ctx) => {
			if (v === undefined) return;

			const n = Number(v);
			if (!isNaN(n)) return n;

			ctx.addIssue({ code: 'custom', message: 'Not a valid number', input: v });
			return z.NEVER;
		}),
});
