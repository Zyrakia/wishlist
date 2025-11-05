import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import ENV from '../env.server';
import path from 'path';

export const db = drizzle(path.resolve(ENV.DATABASE_PATH), { schema, casing: 'snake_case' });
