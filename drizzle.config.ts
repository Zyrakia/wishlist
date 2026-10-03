import { defineConfig } from 'drizzle-kit';
import ENV from './src/lib/server/env';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: { url: ENV.DATABASE_PATH },
	// FTS5 and libSQL vector tables are managed by hand-written migrations
	tablesFilter: ['!*_fts', '!*_fts_*', '!*_shadow'],
	verbose: true,
	strict: true,
});
