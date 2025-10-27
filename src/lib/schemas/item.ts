import z from 'zod';

const normalizeUrl = (raw: string, ctx: z.RefinementCtx) => {
	if (!raw) return null;

	let candidate = raw;
	if (!candidate.match(/^[A-Za-z]+:\/\//)) {
		candidate = `https://${candidate.replace('://', '')}`;
	}

	if (!URL.canParse(candidate)) {
		ctx.addIssue({ code: 'custom', message: 'Invalid URL', input: candidate });
		return z.NEVER;
	}

	return candidate;
};

const toPrice = (raw: string | number, ctx: z.RefinementCtx) => {
	if (raw === '') return null;

	const num = Number(raw);
	if (isNaN(num)) {
		ctx.addIssue({ code: 'custom', message: 'Not a valid number', input: num });
		return z.NEVER;
	} else if (num < 0) {
		ctx.addIssue({ code: 'custom', message: 'Cannot be negative', input: num });
		return z.NEVER;
	}

	return num;
};

export const ItemSchema = z.object({
	name: z
		.string()
		.trim()
		.nonempty('A name is required')
		.min(2, { error: 'Minimum 2 characters' })
		.max(30, { error: 'Maximum 30 characters' }),
	notes: z.string().trim().max(250, { error: 'Maximum 250 characters' }).default(''),
	imageUrl: z.string().trim().transform(normalizeUrl),
	url: z.string().trim().transform(normalizeUrl),
	price: z.string().trim().transform(toPrice),
	priceCurrency: z
		.string()
		.trim()
		.toUpperCase()
		.transform((v) => (v === '' ? 'USD' : v))
		.refine((v) => /^[A-Z]{3}$/.test(v), { error: 'Must be exactly 3 characters' }),
});
