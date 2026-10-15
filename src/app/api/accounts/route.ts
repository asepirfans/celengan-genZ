import pool from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { assert, atomic, failure, id, money, ok, text } from '@/lib/server/api';
export async function POST(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        assert(['cash', 'bank', 'ewallet', 'savings'].includes(body.type), 'Jenis wallet tidak valid.');
        const result = await pool.query('INSERT INTO accounts(user_id,name,type,icon,color,initial_balance) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [user, text(body.name), body.type, body.icon || 'wallet', body.color || '#52613d', money(body.initial_balance ?? 0, true)]);
        return ok(result.rows[0]);
    }
    catch (error) {
        return failure(error);
    }
}
export async function PUT(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        if (body.name !== undefined)
            text(body.name);
        if (body.type !== undefined)
            assert(['cash', 'bank', 'ewallet', 'savings'].includes(body.type), 'Jenis wallet tidak valid.');
        if (body.initial_balance !== undefined)
            money(body.initial_balance, true);
        return ok(await atomic(async (client) => {
            const owned = await client.query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2 FOR UPDATE', [id(body.id), user]);
            assert(owned.rows[0], 'Wallet tidak ditemukan.', 404);
            const linked = await client.query('SELECT goal_id FROM goal_wallets WHERE account_id=$1', [body.id]);
            assert(!linked.rows[0], 'Wallet celengan dikelola melalui Celengan Impian.', 409);
            const result = await client.query('UPDATE accounts SET name=COALESCE($1,name),type=COALESCE($2,type),icon=COALESCE($3,icon),color=COALESCE($4,color),initial_balance=COALESCE($5,initial_balance),is_archived=COALESCE($6,is_archived) WHERE id=$7 AND user_id=$8 RETURNING *', [body.name, body.type, body.icon, body.color, body.initial_balance, body.is_archived, body.id, user]);
            return result.rows[0];
        }));
    }
    catch (error) {
        return failure(error);
    }
}
export async function DELETE(req: Request) {
    try {
        const user = await requireUser(req), account = id(new URL(req.url).searchParams.get('id'));
        return ok(await atomic(async (client) => { const owned = await client.query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2 FOR UPDATE', [account, user]); assert(owned.rows[0], 'Wallet tidak ditemukan.', 404); const used = await client.query('SELECT id FROM transactions WHERE account_id=$1 OR transfer_to_account_id=$1 LIMIT 1', [account]); assert(!used.rows[0], 'Wallet memiliki riwayat transaksi. Arsipkan wallet untuk menyimpan riwayatnya.', 409); await client.query('DELETE FROM accounts WHERE id=$1 AND user_id=$2', [account, user]); return null; }));
    }
    catch (error) {
        return failure(error);
    }
}
