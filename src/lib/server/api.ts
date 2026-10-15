import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
export class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export function assert(condition: unknown, message: string, status = 400): asserts condition { if (!condition)
    throw new ApiError(status, message); }
export function id(value: unknown): string { assert(typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value), 'ID tidak valid.'); return value; }
export function money(value: unknown, allowZero = false): number { const result = Number(value); assert((typeof value === 'number' || typeof value === 'string') && Number.isSafeInteger(result) && result >= (allowZero ? 0 : 1), 'Nominal tidak valid.'); return result; }
export function text(value: unknown, max = 200): string { assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'Teks tidak valid.'); return value.trim(); }
export function failure(error: unknown) {
    if (error instanceof ApiError)
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error instanceof SyntaxError)
        return NextResponse.json({ success: false, error: 'Format permintaan tidak valid.' }, { status: 400 });
    const code = (error as {
        code?: string;
    }).code;
    if (code === '23503')
        return NextResponse.json({ success: false, error: 'Data masih digunakan oleh transaksi atau fitur lain.' }, { status: 409 });
    if (code === '23505')
        return NextResponse.json({ success: false, error: 'Data tersebut sudah ada.' }, { status: 409 });
    console.error('API failed:', code || (error instanceof Error ? error.name : 'unknown'));
    return NextResponse.json({ success: false, error: 'Permintaan belum berhasil. Coba lagi.' }, { status: 500 });
}
export const ok = (data?: unknown) => NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
export async function atomic<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
export async function ownedAccount(client: PoolClient, accountId: unknown, userId: string) {
    const result = await client.query('SELECT * FROM accounts WHERE id=$1 AND user_id=$2 AND NOT COALESCE(is_archived,false) FOR UPDATE', [id(accountId), userId]);
    assert(result.rows[0], 'Wallet tidak ditemukan.', 404);
    return result.rows[0];
}
export async function balance(client: PoolClient, accountId: string, userId: string): Promise<number> {
    const result = await client.query("SELECT COALESCE(a.initial_balance,0) + COALESCE(SUM((CASE WHEN t.type='income' AND t.account_id=a.id THEN t.amount WHEN t.type IN ('expense','transfer') AND t.account_id=a.id THEN -t.amount ELSE 0 END)+(CASE WHEN t.type='transfer' AND t.transfer_to_account_id=a.id THEN t.amount ELSE 0 END)),0) AS balance FROM accounts a LEFT JOIN transactions t ON t.user_id=a.user_id AND (t.account_id=a.id OR t.transfer_to_account_id=a.id) WHERE a.id=$1 AND a.user_id=$2 GROUP BY a.id", [accountId, userId]);
    return Number(result.rows[0]?.balance || 0);
}
export async function categoryAllowed(client: PoolClient, categoryId: unknown, userId: string, type: string) {
    const result = await client.query('SELECT id FROM categories WHERE id=$1 AND (user_id=$2 OR user_id IS NULL) AND type=$3', [id(categoryId), userId, type]);
    assert(result.rows[0], 'Kategori tidak tersedia.', 404);
}
