import { drizzle } from 'drizzle-orm/better-sqlite3';

import ENV from '../env.server';
import * as schema from './schema';

const create = () => drizzle(ENV.DATABASE_PATH, { schema, casing: 'snake_case' });

let _db: ReturnType<typeof create> | null = null;
export const db = () => {
	if (_db) return _db;
	_db = create();
	return _db;
};
