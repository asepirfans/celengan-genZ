import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { ApiError, assert } from './api';
export const PROFILE_COLUMNS = 'id,email,full_name,avatar_url,currency,created_at';
const COOKIE = 'celengan_session';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function checkOrigin(req: Request) {
    const origin = req.headers.get('origin');
    assert(!origin || origin === new URL(req.url).origin || (new URL(origin).host === req.headers.get('host') && new URL(origin).protocol === new URL(req.url).protocol), 'Asal permintaan tidak diizinkan.', 403);
    assert(req.headers.get('sec-fetch-site') !== 'cross-site', 'Asal permintaan tidak diizinkan.', 403);
}
export async function requireUser(req: Request): Promise<string> {
    if (!['GET', 'HEAD'].includes(req.method))
        checkOrigin(req);
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token))
        throw new ApiError(401, 'Sesi berakhir. Silakan masuk kembali.');
    const result = await pool.query('SELECT user_id FROM app_sessions WHERE token_hash=$1 AND expires_at>now()', [hash(token)]);
    if (!result.rows[0])
        throw new ApiError(401, 'Sesi berakhir. Silakan masuk kembali.');
    return result.rows[0].user_id;
}
export async function createSession(userId: string, req: Request) {
    const jar = await cookies();
    const old = jar.get(COOKIE)?.value;
    const token = randomBytes(32).toString('hex');
    await pool.query("INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')", [hash(token), userId]);
    if (old)
        await pool.query('DELETE FROM app_sessions WHERE token_hash=$1', [hash(old)]);
    jar.set(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' || new URL(req.url).protocol === 'https:', path: '/', maxAge: 30 * 86400 });
}
export async function destroySession(req: Request) {
    checkOrigin(req);
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token)
        await pool.query('DELETE FROM app_sessions WHERE token_hash=$1', [hash(token)]);
    jar.set(COOKIE, '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' || new URL(req.url).protocol === 'https:', path: '/', maxAge: 0 });
}
