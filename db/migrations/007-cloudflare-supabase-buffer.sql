CREATE TABLE IF NOT EXISTS cloudflare_email_payloads (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 recipient text NOT NULL,
 raw_base64 text NOT NULL CHECK (octet_length(raw_base64) BETWEEN 1 AND 1400000),
 received_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
 processed_at timestamptz,
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cloudflare_payload_retry_idx ON cloudflare_email_payloads(next_attempt_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS cloudflare_payload_expiry_idx ON cloudflare_email_payloads(expires_at);
CREATE INDEX IF NOT EXISTS cloudflare_payload_user_idx ON cloudflare_email_payloads(user_id);
ALTER TABLE cloudflare_email_payloads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cloudflare_email_payloads FROM anon, authenticated;
