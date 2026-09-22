# docflow-api

Document management API with Google Drive and Notion sync.

Built with Express, TypeScript, and PostgreSQL. OAuth integrations let users connect their Google and Notion workspaces; a background sync job pushes documents to those external services on a schedule.

## Services

- **API** (`src/index.ts`) — REST API for document CRUD and OAuth flows
- **Sync job** (`src/jobs/syncRunner.ts`) — Background job that pushes queued documents to Google Drive / Notion

## Stack

- Node.js / TypeScript
- Express
- PostgreSQL (via `pg`)
- Google OAuth 2.0
- Notion OAuth

## Setup

```bash
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, Google and Notion credentials
npm install
npm run dev
```

## Database

```bash
psql $DATABASE_URL -f schema.sql
```
