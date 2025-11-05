import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import ENV from '../env.server';

export const db = drizzle(ENV.DATABASE_URL, { schema, casing: 'snake_case' });
