import 'sane-env/config';
import { createEnvironment } from 'sane-env';
import z from 'zod';
import { intoTime } from './util/zod';

const ENV = createEnvironment({
	source: process.env,
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
