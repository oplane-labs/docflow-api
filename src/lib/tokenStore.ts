import { query } from './db';

// Stores OAuth access tokens in the `oauth_tokens` table.
// This table is in the shared application schema and is readable
// by any service connected to DATABASE_URL.
export async function saveToken(userId: string, provider: string, accessToken: string) {
  await query(
    `INSERT INTO oauth_tokens (user_id, provider, access_token, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, provider)
     DO UPDATE SET access_token = $3, created_at = NOW()`,
    [userId, provider, accessToken]
  );
}

export async function getToken(userId: string, provider: string): Promise<string | null> {
  const rows = await query(
    `SELECT access_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  return rows[0]?.access_token ?? null;
}
