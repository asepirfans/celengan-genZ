import { randomUUID } from 'node:crypto';
import pool from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { assert, atomic, failure, id, money, ok, text } from '@/lib/server/api';
import { splitAmounts, splitTotal } from '@/lib/split-math';
export async function GET(req: Request) { try {
    const user = await requireUser(req);
    return ok((await pool.query('SELECT * FROM split_bills WHERE user_id=$1 ORDER BY created_at DESC', [user])).rows);
}
catch (error) {
    return failure(error);
} }
export async function POST(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        const subtotal = money(body.subtotal);
        assert(['equal', 'custom'].includes(body.split_mode), 'Metode pembagian tidak valid.');
        assert(Array.isArray(body.participants) && body.participants.length > 0 && body.participants.length <= 100, 'Peserta tidak valid.');
        const tax = Number(body.tax_percent || 0), service = Number(body.service_percent || 0);
        assert(Number.isFinite(tax) && Number.isFinite(service) && tax >= 0 && service >= 0 && tax <= 100 && service <= 100, 'Pajak atau service tidak valid.');
        assert(Math.abs(tax * 100 - Math.round(tax * 100)) < 0.000001 && Math.abs(service * 100 - Math.round(service * 100)) < 0.000001, 'Persentase maksimal dua angka desimal.');
        const people = body.participants.map((person: {
            name: unknown;
            subtotal: unknown;
        }) => ({ name: text(person.name, 100), subtotal: body.split_mode === 'custom' ? money(person.subtotal, true) : 0 }));
        assert(body.split_mode === 'equal' || people.reduce((sum: number, person: {
            subtotal: number;
        }) => sum + person.subtotal, 0) === subtotal, 'Jumlah pesanan peserta harus sama dengan subtotal.');
        const total = splitTotal(subtotal, tax, service);
        money(total);
        const amounts = splitAmounts(subtotal, total, people, body.split_mode);
        const participants = people.map((person: {
            name: string;
            subtotal: number;
        }, index: number) => ({ ...person, id: randomUUID(), amount: amounts[index], paid: false }));
        const result = await pool.query('INSERT INTO split_bills(user_id,request_id,title,subtotal,total,tax_percent,service_percent,split_mode,payment_account,participants) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(user_id,request_id) DO UPDATE SET request_id=EXCLUDED.request_id RETURNING *', [user, id(body.request_id), text(body.title), subtotal, total, tax, service, body.split_mode, text(body.payment_account, 500), JSON.stringify(participants)]);
        return ok(result.rows[0]);
    }
    catch (error) {
        return failure(error);
    }
}
export async function PATCH(req: Request) { try {
    const user = await requireUser(req), body = await req.json();
    assert(typeof body.paid === 'boolean', 'Status pembayaran tidak valid.');
    return ok(await atomic(async (client) => { const result = await client.query('SELECT * FROM split_bills WHERE id=$1 AND user_id=$2 FOR UPDATE', [id(body.id), user]); const bill = result.rows[0]; assert(bill, 'Tagihan tidak ditemukan.', 404); const person = bill.participants.find((item: {
        id: string;
    }) => item.id === body.participant_id); assert(person, 'Peserta tidak ditemukan.', 404); person.paid = body.paid; const updated = await client.query('UPDATE split_bills SET participants=$1 WHERE id=$2 AND user_id=$3 RETURNING *', [JSON.stringify(bill.participants), body.id, user]); return updated.rows[0]; }));
}
catch (error) {
    return failure(error);
} }
export async function DELETE(req: Request) { try {
    const user = await requireUser(req);
    const result = await pool.query('DELETE FROM split_bills WHERE id=$1 AND user_id=$2 RETURNING id', [id(new URL(req.url).searchParams.get('id')), user]);
    assert(result.rows[0], 'Tagihan tidak ditemukan.', 404);
    return ok();
}
catch (error) {
    return failure(error);
} }
