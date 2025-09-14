import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import config from '../config/index.js';

const pool = new Pool({
  host: config.PGHOST,
  port: config.PGPORT,
  database: config.PGDATABASE,
  user: config.PGUSER,
  password: config.PGPASSWORD,
});

export const db = drizzle(pool, { schema });
export default db;
