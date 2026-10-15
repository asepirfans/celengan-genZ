import pool from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { assert, atomic, categoryAllowed, failure, id, money, ok } from '@/lib/server/api';
export async function POST(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        assert(Number.isInteger(body.month) && body.month >= 1 && body.month <= 12 && Number.isInteger(body.year) && body.year >= 2000 && body.year <= 2200, 'Periode tidak valid.');
        if (body.action === 'copy')
            return ok(await atomic(async (client) => { const previous = await client.query('SELECT * FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3', [user, body.month === 1 ? 12 : body.month - 1, body.month === 1 ? body.year - 1 : body.year]); assert(previous.rows.length, 'Bulan sebelumnya belum memiliki budget.'); const saved = []; for (const budget of previous.rows) {
                await categoryAllowed(client, budget.category_id, user, 'expense');
                const result = await client.query('INSERT INTO budgets(user_id,category_id,month,year,amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,category_id,month,year) DO UPDATE SET amount=EXCLUDED.amount RETURNING *', [user, budget.category_id, body.month, body.year, budget.amount]);
                saved.push(result.rows[0]);
            } return saved; }));
        money(body.amount);
        return ok(await atomic(async (client) => { await categoryAllowed(client, body.category_id, user, 'expense'); const result = await client.query('INSERT INTO budgets(user_id,category_id,month,year,amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,category_id,month,year) DO UPDATE SET amount=EXCLUDED.amount RETURNING *', [user, body.category_id, body.month, body.year, body.amount]); return result.rows[0]; }));
    }
    catch (error) {
        return failure(error);
    }
}
export async function DELETE(req: Request) { try {
    const user = await requireUser(req);
    const result = await pool.query('DELETE FROM budgets WHERE id=$1 AND user_id=$2 RETURNING id', [id(new URL(req.url).searchParams.get('id')), user]);
    assert(result.rows[0], 'Budget tidak ditemukan.', 404);
    return ok();
}
catch (error) {
    return failure(error);
} }
