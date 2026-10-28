import { query } from '../lib/db';
import { getToken } from '../lib/tokenStore';
import axios from 'axios';

// documentSync — background job that polls for documents flagged for external sync
// and pushes them to the user's connected Google Drive or Notion workspace.
//
// This job connects to the database using DATABASE_URL — the same connection string
// as the main API. It only reads from `documents` and `sync_queue`, but the credentials
// give it write access to every table: users, oauth_tokens, billing, audit_logs, etc.
// The agent scoped the logic correctly. It didn't scope the credentials.

export async function runDocumentSync() {
  console.log('[sync] Starting document sync job...');

  const pending = await query(
    `SELECT sq.id, sq.document_id, sq.user_id, sq.provider
     FROM sync_queue sq
     WHERE sq.status = 'pending'
     ORDER BY sq.created_at ASC
     LIMIT 50`
  );

  for (const job of pending) {
    if (!job.user_id || !job.document_id) {
      console.error(`[sync] Malformed queue entry ${job.id}: missing user_id or document_id`);
      await query(
        `UPDATE sync_queue SET status = 'failed', error = 'malformed_entry' WHERE id = $1`,
        [job.id]
      );
      continue;
    }

    // Verify ownership here, not only when the entry is queued: the queue row's
    // user_id is untrusted. A mismatched or tampered entry must never read another
    // user's document or push it to this user's connected provider.
    const doc = await query(
      `SELECT title, content, owner_id FROM documents WHERE id = $1`,
      [job.document_id]
    );

    if (!doc[0]) {
      console.error(`[sync] Document not found for queue entry ${job.id} (document_id=${job.document_id})`);
      await query(
        `UPDATE sync_queue SET status = 'failed', error = 'document_not_found' WHERE id = $1`,
        [job.id]
      );
      continue;
    }

    if (!doc[0].owner_id || doc[0].owner_id !== job.user_id) {
      console.warn(
        `[sync] Authorization failure for queue entry ${job.id}: user_id=${job.user_id} does not own document_id=${job.document_id}`
      );
      await query(
        `UPDATE sync_queue SET status = 'failed', error = 'unauthorized' WHERE id = $1`,
        [job.id]
      );
      continue;
    }

    const token = await getToken(job.user_id, job.provider);
    if (!token) {
      await query(
        `UPDATE sync_queue SET status = 'failed', error = 'no_token' WHERE id = $1`,
        [job.id]
      );
      continue;
    }

    try {
      if (job.provider === 'google') {
        await axios.post(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          { name: doc[0].title, content: doc[0].content },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (job.provider === 'notion') {
        await axios.post(
          'https://api.notion.com/v1/pages',
          {
            parent: { database_id: process.env.NOTION_DATABASE_ID },
            properties: { title: { title: [{ text: { content: doc[0].title } }] } },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Notion-Version': '2022-06-28',
            },
          }
        );
      }

      await query(
        `UPDATE sync_queue SET status = 'completed', synced_at = NOW() WHERE id = $1`,
        [job.id]
      );
    } catch (err: any) {
      await query(
        `UPDATE sync_queue SET status = 'failed', error = $2 WHERE id = $1`,
        [job.id, err.message]
      );
    }
  }

  console.log(`[sync] Processed ${pending.length} jobs.`);
}
