-- docflow-api database schema
-- Single shared database; all services connect with the same DATABASE_URL.

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth tokens for Google and Notion integrations.
-- Stored in the shared schema. Any service with DATABASE_URL can SELECT from this table.
CREATE TABLE oauth_tokens (
  user_id UUID REFERENCES users(id),
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

-- Sync queue consumed by the background sync job.
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  user_id UUID REFERENCES users(id),
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Billing records — written by the billing service, read by the API.
-- The sync job and analytics service also connect with DATABASE_URL
-- and have implicit write access here.
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  amount_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
