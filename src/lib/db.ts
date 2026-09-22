import { Pool } from 'pg';

// Shared DB pool used across the entire application
// Connection string includes write access to all tables
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const result = await db.query(text, params);
  return result.rows;
}
