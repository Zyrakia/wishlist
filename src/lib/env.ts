import { createEnv } from '@t3-oss/env-core';
import DotenvFlow from 'dotenv-flow';
import z from 'zod';
import { intoTime } from './util/zod';

const isServer = () => {
	if (typeof process !== 'undefined') return true;
	return typeof window === 'undefined';
};

const getRuntimeEnv = () => {
	if (isServer() && process.env) return process.env;
	return import.meta.env;
};

if (isServer()) {
	const { error } = DotenvFlow.config();
	if (error) console.warn('No environment loaded from `.env` files.');
}

const ENV = createEnv({
	runtimeEnv: getRuntimeEnv(),
	emptyStringAsUndefined: true,
	clientPrefix: 'VITE_',
	isServer: isServer(),
	client: {},
	server: {
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
