import { createEnvironment } from 'sane-env';
import { loadEnvironment } from 'sane-env/load';
import z from 'zod';
import { intoTime } from '../util/zod';

const mode = process.env.NODE_ENV;

const fileEnvironment = loadEnvironment({
	files: ['.env', '.env.local', ...(mode ? [`.env.${mode}`, `.env.${mode}.local`] : [])],
});

// Real environment variables take precedence over `.env` files
const source = Object.fromEntries(
	Object.entries({ ...fileEnvironment, ...process.env }).filter(([, value]) => value?.trim()),
);

const ENV = createEnvironment({
	source,
	schema: {
		DATABASE_PATH: z.string().transform((v) => {
			if (v.startsWith('file:')) return v;
			return `file:${v}`;
		}),
		JWT_SECRET: z.string(),
		JWT_LIFETIME: z.string().default('7d').transform(intoTime),
		JWT_MAX_LIFETIME: z.string().default('30d').transform(intoTime),
		SALT_ROUNDS: z.coerce.number().min(1).default(12),
		MISTRAL_AI_KEY: z.string(),
		RESEND_KEY: z.string(),
		EMAIL_FROM: z.string(),
	},
});

export default ENV;
