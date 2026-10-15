CREATE TABLE IF NOT EXISTS app_sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_attempts (
 key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, reset_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS goal_wallets (
 goal_id uuid PRIMARY KEY REFERENCES savings_goals(id) ON DELETE CASCADE,
 account_id uuid UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS goal_contributions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), goal_id uuid NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
 transaction_id uuid UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
 amount numeric NOT NULL, request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(goal_id,request_id)
);
CREATE TABLE IF NOT EXISTS split_bills (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, title text NOT NULL, subtotal numeric NOT NULL, total numeric NOT NULL,
 tax_percent numeric NOT NULL DEFAULT 0, service_percent numeric NOT NULL DEFAULT 0,
 split_mode text NOT NULL CHECK(split_mode IN ('equal','custom')), payment_account text NOT NULL,
 participants jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS split_bills_user_idx ON split_bills(user_id,created_at);
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
