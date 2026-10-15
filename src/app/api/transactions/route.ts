import { requireUser } from '@/lib/server/auth';
import { assert, atomic, balance, categoryAllowed, failure, id, money, ok, ownedAccount } from '@/lib/server/api';
async function write(req: Request, editing: boolean) {
    try {
        const user = await requireUser(req), body = await req.json();
        return ok(await atomic(async (client) => {
            let existing;
            if (editing) {
                const result = await client.query('SELECT * FROM transactions WHERE id=$1 AND user_id=$2 FOR UPDATE', [id(body.id), user]);
                existing = result.rows[0];
                assert(existing, 'Transaksi tidak ditemukan.', 404);
                const linked = await client.query('SELECT id FROM goal_contributions WHERE transaction_id=$1', [body.id]);
                assert(!linked.rows[0], 'Transfer celengan dikelola melalui Celengan Impian.', 409);
            }
            const data = { ...existing, ...body };
            const amount = money(data.amount);
            assert(['income', 'expense', 'transfer'].includes(data.type), 'Jenis transaksi tidak valid.');
            assert(!data.note || (typeof data.note === 'string' && data.note.length <= 500), 'Catatan terlalu panjang.');
            const date = new Date(data.date || Date.now());
            assert(!Number.isNaN(date.getTime()), 'Tanggal tidak valid.');
            const accountIds = [...new Set([id(data.account_id), ...(data.type === 'transfer' ? [id(data.transfer_to_account_id)] : []), ...(existing ? [existing.account_id, ...(existing.transfer_to_account_id ? [existing.transfer_to_account_id] : [])] : [])])].sort();
            for (const accountId of accountIds)
                await ownedAccount(client, accountId, user);
            const protectedAccounts = await client.query('SELECT account_id FROM goal_wallets WHERE account_id=ANY($1::uuid[])', [accountIds]);
            assert(!protectedAccounts.rows[0], 'Gunakan menu Celengan Impian untuk wallet celengan.', 409);
            if (data.type === 'transfer') {
                assert(data.account_id !== data.transfer_to_account_id, 'Wallet tujuan harus berbeda.');
                let previousDelta = 0;
                if (existing?.account_id === data.account_id)
                    previousDelta += existing.type === 'income' ? Number(existing.amount) : -Number(existing.amount);
                if (existing?.type === 'transfer' && existing.transfer_to_account_id === data.account_id)
                    previousDelta += Number(existing.amount);
                const available = await balance(client, data.account_id, user) - previousDelta;
                assert(available >= amount, 'Saldo sumber tidak cukup.', 409);
            }
            else
                await categoryAllowed(client, data.category_id, user, data.type);
            const args = [data.account_id, data.type === 'transfer' ? null : data.category_id, data.type, amount, data.note || null, date.toISOString(), data.type === 'transfer' ? data.transfer_to_account_id : null];
            const result = editing ? await client.query('UPDATE transactions SET account_id=$1,category_id=$2,type=$3,amount=$4,note=$5,date=$6,transfer_to_account_id=$7 WHERE id=$8 AND user_id=$9 RETURNING *', [...args, body.id, user]) : await client.query('INSERT INTO transactions(account_id,category_id,type,amount,note,date,transfer_to_account_id,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [...args, user]);
            return result.rows[0];
        }));
    }
    catch (error) {
        return failure(error);
    }
}
export const POST = (req: Request) => write(req, false);
export const PUT = (req: Request) => write(req, true);
export async function DELETE(req: Request) {
    try {
        const user = await requireUser(req), params = new URL(req.url).searchParams;
        const ids = params.get('ids') ? JSON.parse(params.get('ids')!) : params.get('id') ? [params.get('id')] : (await req.json()).ids;
        assert(Array.isArray(ids) && ids.length > 0 && ids.length <= 500, 'Pilihan transaksi tidak valid.');
        const unique = [...new Set<string>(ids.map(id))];
        return ok(await atomic(async (client) => {
            const rows = await client.query('SELECT * FROM transactions WHERE id=ANY($1::uuid[]) AND user_id=$2 FOR UPDATE', [unique, user]);
            assert(rows.rows.length === unique.length, 'Transaksi tidak ditemukan.', 404);
            const linked = await client.query('SELECT id FROM goal_contributions WHERE transaction_id=ANY($1::uuid[])', [unique]);
            assert(!linked.rows[0], 'Transfer celengan tidak dapat dihapus di sini.', 409);
            const accounts = [...new Set<string>(rows.rows.flatMap(t => [t.account_id, t.transfer_to_account_id].filter(Boolean)))].sort();
            for (const account of accounts)
                await client.query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2 FOR UPDATE', [account, user]);
            await client.query('DELETE FROM transactions WHERE id=ANY($1::uuid[]) AND user_id=$2', [unique, user]);
            return { ids: unique };
        }));
    }
    catch (error) {
        return failure(error);
    }
}
