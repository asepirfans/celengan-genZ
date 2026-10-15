import pool from '@/lib/db';
import { requireUser, PROFILE_COLUMNS } from '@/lib/server/auth';
import { assert, failure, ok, text } from '@/lib/server/api';
export async function PUT(req: Request) {
    try {
        const user = await requireUser(req), body = await req.json();
        if (body.currency !== undefined)
            assert(['IDR', 'USD', 'SGD', 'MYR'].includes(body.currency), 'Mata uang tidak valid.');
        if (body.full_name !== undefined)
            text(body.full_name);
        if (body.avatar_url)
            assert(typeof body.avatar_url === 'string' && body.avatar_url.length <= 2000 && /^https?:\/\//.test(body.avatar_url), 'URL avatar tidak valid.');
        const result = await pool.query('UPDATE profiles SET full_name=COALESCE($1,full_name),currency=COALESCE($2,currency),avatar_url=CASE WHEN $3 THEN $4 ELSE avatar_url END WHERE id=$5 RETURNING ' + PROFILE_COLUMNS, [body.full_name, body.currency, Object.hasOwn(body, 'avatar_url'), body.avatar_url || null, user]);
        return ok(result.rows[0]);
    }
    catch (error) {
        return failure(error);
    }
}
