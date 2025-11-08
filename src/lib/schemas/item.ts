import z from 'zod';

const                                       normalizeUrl = (raw: string, ctx: z.RefinementCtx) => {
	if (!raw) return null;

	let candidate = raw;
	if (!candidate.match(/^[A-Za-z]+:\/\//)) {
		candidate = `https://${candidate.replace(/:\/{1,2}/, '')}`;
	}

	try {
		const url = new URL(candidate);

		if (!candidate.startsWith(url.origin)) {
			ctx.addIssue({ code: 'custom', message: 'Invalid URL', input: url.origin });
			return z.NEVER;
		}

		return candidate;
	} catch (err) {
		ctx.addIssue({ code: 'custom', message: 'Invalid URL', input: candidate });
		return z.NEVER;
	}
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
		.max(50, { error: 'Maximum 50 characters' }),
	notes: z.string().trim().max(250, { error: 'Maximum 250 characters' }).default(''),
	imageUrl: z.string().trim().transform(normalizeUrl),
	url: z.string().trim().transform(normalizeUrl),
	price: z.string().trim().or(z.number()).transform(toPrice),
	priceCurrency: z
		.string()
		.trim()
		.toUpperCase()
		.transform((v) => (v === '' ? 'USD' : v ? v : null))
		.refine((v) => (v === null ? true : /^[A-Z]{3}$/.test(v)), {
			error: 'Must be exactly 3 characters',
		}),
});

export const RequiredUrlSchema = ItemSchema.shape.url.transform((v, ctx) => {
	if (v === null) {
		ctx.addIssue({ code: 'custom', message: 'URL is required' });
		return z.NEVER;
	}

	return v;
});

export type Item = z.infer<typeof ItemSchema>;
