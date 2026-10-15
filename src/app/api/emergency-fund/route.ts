import pool from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { assert, atomic, failure, id, money, ok } from '@/lib/server/api';
export async function GET(req: Request) { try {
    const user = await requireUser(req);
    return ok((await pool.query('SELECT * FROM emergency_funds WHERE user_id=$1', [user])).rows[0] || null);
}
catch (error) {
    return failure(error);
} }
export async function POST(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        assert(['single', 'married', 'freelance'].includes(body.profile_type), 'Profil tidak valid.');
        money(body.monthly_expense);
        assert(Number.isInteger(body.target_months) && body.target_months >= 1 && body.target_months <= 36, 'Target bulan tidak valid.');
        assert(Array.isArray(body.selected_account_ids) && body.selected_account_ids.length <= 100, 'Pilihan wallet tidak valid.');
        const ids = [...new Set<string>(body.selected_account_ids.map(id))];
        return ok(await atomic(async (client) => { const accounts = await client.query('SELECT id FROM accounts WHERE id=ANY($1::uuid[]) AND user_id=$2 AND NOT COALESCE(is_archived,false)', [ids, user]); assert(accounts.rows.length === ids.length, 'Wallet tidak tersedia.', 404); const result = await client.query('INSERT INTO emergency_funds(user_id,profile_type,monthly_expense,target_months,selected_account_ids,updated_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(user_id) DO UPDATE SET profile_type=EXCLUDED.profile_type,monthly_expense=EXCLUDED.monthly_expense,target_months=EXCLUDED.target_months,selected_account_ids=EXCLUDED.selected_account_ids,updated_at=now() RETURNING *', [user, body.profile_type, body.monthly_expense, body.target_months, ids]); return result.rows[0]; }));
    }
    catch (error) {
        return failure(error);
    }
}
