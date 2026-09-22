import dotenv from 'dotenv';
dotenv.config();

import { runDocumentSync } from './documentSync';

// Entry point for the sync job. Runs on a cron schedule (every 5 minutes).
// Shares the same DATABASE_URL as the main API process.
runDocumentSync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[sync] Fatal error:', err);
    process.exit(1);
  });
