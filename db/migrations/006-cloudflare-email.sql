ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'resend';
ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS recipient text;
ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS verification jsonb;
