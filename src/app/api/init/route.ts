import pool from '@/lib/db';
import { requireUser, PROFILE_COLUMNS } from '@/lib/server/auth';
import { failure, ok } from '@/lib/server/api';
export async function GET(req: Request) {
    try {
        const user = await requireUser(req);
        const [p, a, c, t, b, e, g] = await Promise.all([
            pool.query('SELECT ' + PROFILE_COLUMNS + ' FROM profiles WHERE id=$1', [user]),
            pool.query('SELECT * FROM accounts WHERE user_id=$1 ORDER BY created_at', [user]),
            pool.query('SELECT * FROM categories WHERE user_id=$1 OR user_id IS NULL ORDER BY name', [user]),
            pool.query('SELECT * FROM transactions WHERE user_id=$1 ORDER BY date DESC', [user]),
            pool.query('SELECT * FROM budgets WHERE user_id=$1', [user]),
            pool.query('SELECT * FROM emergency_funds WHERE user_id=$1', [user]),
            pool.query('SELECT w.account_id FROM goal_wallets w JOIN savings_goals g ON g.id=w.goal_id WHERE g.user_id=$1', [user])
        ]);
        const goalIds = new Set(g.rows.map(row => row.account_id));
        const defaultIds = a.rows.filter(row => !row.is_archived && !goalIds.has(row.id) && (row.type === 'savings' || /darurat|emergency/i.test(row.name))).map(row => row.id);
        const emergencyFund = e.rows[0] || { profile_type: 'single', monthly_expense: 3000000, target_months: 3, selected_account_ids: defaultIds };
        return ok({ profile: p.rows[0], accounts: a.rows, categories: c.rows, transactions: t.rows, budgets: b.rows, emergencyFund, goalAccountIds: [...goalIds] });
    }
    catch (error) {
        return failure(error);
    }
}
