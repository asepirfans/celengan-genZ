ALTER TABLE email_wallet_routes ADD COLUMN IF NOT EXISTS expense_category_id uuid REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE email_wallet_routes ADD COLUMN IF NOT EXISTS income_category_id uuid REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS sync_reason text;
UPDATE email_wallet_routes SET expense_category_id=category_id WHERE transaction_type='expense' AND expense_category_id IS NULL;
UPDATE email_wallet_routes SET income_category_id=category_id WHERE transaction_type='income' AND income_category_id IS NULL;
UPDATE inbound_emails SET status='ignored' WHERE status='pending' AND sender='forwarding-noreply@google.com' AND subject ILIKE '%Gmail%';
