import z from 'zod';

const emptyToNull = (v: any) => {
	if (typeof v === 'string' && v.trim() === '') return null;
	return v;
};

const emptyToUndefined = (v: any) => {
	if (typeof v === 'string' && v.trim() === '') return;
	return v;
};

const normalizeUrl = (v: any) => {
	if (typeof v !== 'string') return v;
	if (!v) return v;

	if (v.match(/^[A-Za-z]+:\/\//)) return v;

	return `https://${v.replace('://', '')}`;
};

const priceTransform = (v: unknown, ctx: z.RefinementCtx) => {
	if (v === undefined || v === null) return v;

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
};

export const ItemSchema = z.object({
	name: z
		.string()
		.trim()
		.nonempty('A name is required')
		.min(2, { error: 'Minimum 2 characters' })
		.max(30, { error: 'Maximum 30 characters' }),
	notes: z.string().trim().max(250, { error: 'Maximum 250 characters' }).default(''),
	imageUrl: z.preprocess(emptyToNull, z.union([z.string().trim().transform(normalizeUrl), z.null()])),
	url: z.preprocess(emptyToNull, z.union([z.string().trim().transform(normalizeUrl), z.null()])),
	price: z.preprocess(
		emptyToNull,
		z
			.union([z.number(), z.string().trim().max(15, { error: 'Maximum 15 characters' }), z.null()])
			.transform(priceTransform),
	),
	priceCurrency: z.preprocess(
		emptyToUndefined,
		z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/, { error: 'Must be exactly 3 letters' })
			.default('USD'),
	),
});
