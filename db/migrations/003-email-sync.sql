ALTER TABLE email_wallet_routes ADD COLUMN IF NOT EXISTS auto_sync boolean NOT NULL DEFAULT false;
ALTER TABLE email_wallet_routes ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE email_wallet_routes ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'expense' CHECK(transaction_type IN ('income','expense'));
ALTER TABLE email_wallet_routes ADD COLUMN IF NOT EXISTS auto_enabled_at timestamptz;
ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS auto_posted boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS email_transaction_keys (
 user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 dedupe_key text NOT NULL,
 transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
 PRIMARY KEY(user_id,dedupe_key)
);
