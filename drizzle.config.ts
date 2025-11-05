import { defineConfig } from 'drizzle-kit';
import ENV from './src/lib/server/env.server';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: { url: ENV.DATABASE_PATH },
	verbose: true,
	strict: true,
});
