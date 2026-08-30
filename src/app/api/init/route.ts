import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let profile = null;

    if (userId) {
      const profileRes = await pool.query('SELECT * FROM profiles WHERE id = $1', [userId]);
      profile = profileRes.rows[0];
    }

    if (!profile) {
      const firstProf = await pool.query('SELECT * FROM profiles ORDER BY created_at ASC LIMIT 1');
      profile = firstProf.rows[0];
    }

    if (!profile) {
      return NextResponse.json({
        success: true,
        data: {
          profile: null,
          accounts: [],
          categories: [],
          transactions: [],
          budgets: []
        }
      });
    }

    // 2. Fetch Accounts for this user (Auto-seed starter template accounts if empty)
    let accountsRes = await pool.query('SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC', [profile.id]);
    
    if (accountsRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO accounts (user_id, name, type, icon, color, initial_balance) VALUES
        ($1, 'Rekening Bank (BCA/Mandiri)', 'bank', 'landmark', '#00529C', 0),
        ($1, 'E-Wallet (GoPay/OVO/ShopeePay)', 'ewallet', 'smartphone', '#00AED6', 0),
        ($1, 'Dompet Tunai (Cash)', 'cash', 'banknote', '#38BDF8', 0),
        ($1, 'Dana Darurat (Vault)', 'bank', 'shield-check', '#3EFF9A', 0)
      `, [profile.id]);

      accountsRes = await pool.query('SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC', [profile.id]);
    }
    
    // 3. Fetch Categories (Isolate per user: default templates + this user custom categories)
    let categoriesRes = await pool.query(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1 ORDER BY id ASC',
      [profile.id]
    );

    // 4. Fetch Transactions for this user
    let trxRes = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', [profile.id]);

    // 5. Fetch Budgets for this user
    const budgetRes = await pool.query('SELECT * FROM budgets WHERE user_id = $1 ORDER BY created_at DESC', [profile.id]);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        accounts: accountsRes.rows,
        categories: categoriesRes.rows,
        transactions: trxRes.rows,
        budgets: budgetRes.rows
      }
    });
  } catch (error: any) {
    console.error('API /api/init error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
