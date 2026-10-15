CREATE TABLE IF NOT EXISTS email_inboxes (
 user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
 local_part text NOT NULL UNIQUE, enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_wallet_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 sender text NOT NULL, account_hint text NOT NULL, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 UNIQUE(user_id,sender,account_hint)
);
CREATE TABLE IF NOT EXISTS inbound_emails (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 provider_id text NOT NULL, sender text NOT NULL, subject text NOT NULL,
 received_at timestamptz NOT NULL, suggested jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','posted','ignored')),
 transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,provider_id)
);
CREATE INDEX IF NOT EXISTS inbound_emails_user_idx ON inbound_emails(user_id,created_at DESC);
