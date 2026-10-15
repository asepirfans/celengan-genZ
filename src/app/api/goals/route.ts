import pool from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { assert, atomic, balance, failure, id, money, ok, ownedAccount, text } from '@/lib/server/api';
async function makeWallet(client: import('pg').PoolClient, user: string, goal: {
    id: string;
    title: string;
}) {
    const current = await client.query('SELECT account_id FROM goal_wallets WHERE goal_id=$1', [goal.id]);
    if (current.rows[0])
        return current.rows[0].account_id;
    const result = await client.query("INSERT INTO accounts(user_id,name,type,icon,color,initial_balance) VALUES($1,$2,'savings','target','#52613d',0) RETURNING id", [user, 'Celengan · ' + goal.title]);
    await client.query('INSERT INTO goal_wallets(goal_id,account_id) VALUES($1,$2)', [goal.id, result.rows[0].id]);
    return result.rows[0].id;
}
export async function GET(req: Request) { try {
    const user = await requireUser(req);
    const goalId = new URL(req.url).searchParams.get('goalId');
    if (goalId) {
        const owned = await pool.query('SELECT id FROM savings_goals WHERE id=$1 AND user_id=$2 AND NOT is_archived', [id(goalId), user]);
        assert(owned.rows[0], 'Celengan tidak ditemukan.', 404);
        return ok((await pool.query('SELECT c.*,t.date,t.account_id,t.transfer_to_account_id FROM goal_contributions c JOIN transactions t ON t.id=c.transaction_id WHERE c.goal_id=$1 ORDER BY c.created_at DESC', [goalId])).rows);
    }
    return ok((await pool.query("SELECT g.*,w.account_id,GREATEST(0,COALESCE(g.current_amount,0)-COALESCE(a.initial_balance,0)-COALESCE((SELECT SUM(CASE WHEN t.account_id=w.account_id AND t.type='income' THEN t.amount WHEN t.account_id=w.account_id THEN -t.amount ELSE t.amount END) FROM transactions t WHERE t.user_id=g.user_id AND (t.account_id=w.account_id OR (t.type='transfer' AND t.transfer_to_account_id=w.account_id))),0)) AS legacy_amount FROM savings_goals g LEFT JOIN goal_wallets w ON w.goal_id=g.id LEFT JOIN accounts a ON a.id=w.account_id WHERE g.user_id=$1 AND NOT g.is_archived ORDER BY g.created_at DESC", [user])).rows);
}
catch (error) {
    return failure(error);
} }
export async function POST(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        if (body.action === 'contribute')
            return ok(await atomic(async (client) => {
                const result = await client.query('SELECT * FROM savings_goals WHERE id=$1 AND user_id=$2 AND NOT is_archived FOR UPDATE', [id(body.id), user]);
                const goal = result.rows[0];
                assert(goal, 'Celengan tidak ditemukan.', 404);
                const request = id(body.request_id), amount = money(body.amount);
                assert(['deposit', 'withdraw', 'link_legacy'].includes(body.direction), 'Arah transfer tidak valid.');
                const previous = await client.query('SELECT t.*,c.amount AS contribution_amount FROM goal_contributions c JOIN transactions t ON t.id=c.transaction_id WHERE c.goal_id=$1 AND c.request_id=$2', [goal.id, request]);
                if (previous.rows[0]) {
                    const prior = previous.rows[0];
                    assert(Number(prior.contribution_amount) === (body.direction === 'link_legacy' ? 0 : body.direction === 'withdraw' ? -amount : amount) && Number(prior.amount) === amount && (body.direction === 'withdraw' ? prior.transfer_to_account_id === body.account_id : prior.account_id === body.account_id), 'Permintaan ini sudah diproses dengan rincian berbeda.', 409);
                    return { goal, transaction: prior };
                }
                const destination = await makeWallet(client, user, goal), account = id(body.account_id);
                assert(account !== destination, 'Pilih wallet lain.');
                const otherGoal = await client.query('SELECT account_id FROM goal_wallets WHERE account_id=$1', [account]);
                assert(!otherGoal.rows[0], 'Pilih wallet biasa sebagai sumber atau tujuan.');
                for (const accountId of [account, destination].sort())
                    await ownedAccount(client, accountId, user);
                if (body.direction === 'link_legacy')
                    assert(Number(goal.current_amount) - (await balance(client, destination, user)) >= amount, 'Nominal melebihi saldo lama yang belum dihubungkan.', 409);
                const source = body.direction === 'withdraw' ? destination : account, target = body.direction === 'withdraw' ? account : destination;
                assert(await balance(client, source, user) >= amount, 'Saldo wallet tidak cukup.', 409);
                if (body.direction === 'withdraw')
                    assert(Number(goal.current_amount) >= amount, 'Saldo celengan tidak cukup.', 409);
                const transaction = await client.query("INSERT INTO transactions(user_id,account_id,transfer_to_account_id,type,amount,note,date) VALUES($1,$2,$3,'transfer',$4,$5,now()) RETURNING *", [user, source, target, amount, (body.direction === 'withdraw' ? 'Tarik tabungan: ' : body.direction === 'link_legacy' ? 'Hubungkan saldo lama: ' : 'Menabung: ') + goal.title]);
                const signed = body.direction === 'link_legacy' ? 0 : body.direction === 'withdraw' ? -amount : amount;
                await client.query('INSERT INTO goal_contributions(goal_id,transaction_id,amount,request_id) VALUES($1,$2,$3,$4)', [goal.id, transaction.rows[0].id, signed, request]);
                const updated = await client.query('UPDATE savings_goals SET current_amount=COALESCE(current_amount,0)+$1 WHERE id=$2 RETURNING *', [signed, goal.id]);
                return { goal: { ...updated.rows[0], account_id: destination }, transaction: transaction.rows[0] };
            }));
        const title = text(body.title), target = money(body.target_amount);
        assert(Number(body.current_amount || 0) === 0, 'Buat celengan dengan saldo 0, lalu transfer dari wallet.');
        if (body.target_date)
            assert(/^\d{4}-\d{2}-\d{2}$/.test(body.target_date), 'Tanggal target tidak valid.');
        return ok(await atomic(async (client) => { const result = await client.query('INSERT INTO savings_goals(user_id,title,target_amount,current_amount,target_date,icon,color,image_url) VALUES($1,$2,$3,0,$4,$5,$6,$7) RETURNING *', [user, title, target, body.target_date || null, body.icon || 'target', body.color || '#52613d', body.image_url || null]); const account = await makeWallet(client, user, result.rows[0]); return { ...result.rows[0], account_id: account }; }));
    }
    catch (error) {
        return failure(error);
    }
}
export async function PUT(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        return ok(await atomic(async (client) => {
            const result = await client.query('SELECT * FROM savings_goals WHERE id=$1 AND user_id=$2 AND NOT is_archived FOR UPDATE', [id(body.id), user]);
            assert(result.rows[0], 'Celengan tidak ditemukan.', 404);
            if (body.current_amount !== undefined)
                assert(Number(body.current_amount) === Number(result.rows[0].current_amount), 'Saldo hanya berubah melalui transfer wallet.');
            if (body.title !== undefined)
                text(body.title);
            if (body.target_amount !== undefined)
                money(body.target_amount);
            const updated = await client.query('UPDATE savings_goals SET title=COALESCE($1,title),target_amount=COALESCE($2,target_amount),target_date=CASE WHEN $3 THEN $4 ELSE target_date END,icon=COALESCE($5,icon),color=COALESCE($6,color),image_url=CASE WHEN $7 THEN $8 ELSE image_url END WHERE id=$9 AND user_id=$10 RETURNING *', [body.title, body.target_amount, Object.hasOwn(body, 'target_date'), body.target_date || null, body.icon, body.color, Object.hasOwn(body, 'image_url'), body.image_url || null, body.id, user]);
            await client.query('UPDATE accounts a SET name=$1 FROM goal_wallets w WHERE w.account_id=a.id AND w.goal_id=$2 AND a.user_id=$3', ['Celengan · ' + updated.rows[0].title, body.id, user]);
            return updated.rows[0];
        }));
    }
    catch (error) {
        return failure(error);
    }
}
export async function DELETE(req: Request) { try {
    const user = await requireUser(req), goalId = id(new URL(req.url).searchParams.get('id'));
    return ok(await atomic(async (client) => { const owned = await client.query('SELECT id FROM savings_goals WHERE id=$1 AND user_id=$2 AND NOT is_archived FOR UPDATE', [goalId, user]); assert(owned.rows[0], 'Celengan tidak ditemukan.', 404); const linked = await client.query('SELECT account_id FROM goal_wallets WHERE goal_id=$1', [goalId]); if (linked.rows[0]) {
        await ownedAccount(client, linked.rows[0].account_id, user);
        assert(await balance(client, linked.rows[0].account_id, user) === 0, 'Tarik seluruh saldo celengan sebelum menghapusnya.', 409);
        await client.query('UPDATE accounts SET is_archived=true WHERE id=$1 AND user_id=$2', [linked.rows[0].account_id, user]);
    } await client.query('UPDATE savings_goals SET is_archived=true WHERE id=$1 AND user_id=$2', [goalId, user]); return null; }));
}
catch (error) {
    return failure(error);
} }
