import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import config from '../config/index.js';

const { Pool } = pkg as any;
export const pool = new Pool({
  host: config.PGHOST,
  port: config.PGPORT,
  database: config.PGDATABASE,
  user: config.PGUSER,
  password: config.PGPASSWORD
});
const db = drizzle(pool);
export default db;
