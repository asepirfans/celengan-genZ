import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { assert, atomic, failure, ok, text } from '@/lib/server/api';
import { checkOrigin, createSession, destroySession, hash, PROFILE_COLUMNS } from '@/lib/server/auth';
export async function DELETE(req: Request) { try {
    await destroySession(req);
    return ok();
}
catch (error) {
    return failure(error);
} }
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const body = await req.json();
        const email = text(body.email, 254).toLowerCase();
        assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Email tidak valid.');
        assert(typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 128, 'Password wajib diisi.');
        const password = body.password;
        assert(['login', 'register'].includes(body.action), 'Aksi tidak valid.');
        const attemptKey = hash(email);
        const attempts = await pool.query("INSERT INTO auth_attempts(key,attempts,reset_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.reset_at END RETURNING attempts", [attemptKey]);
        assert(attempts.rows[0].attempts <= 10, 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.', 429);
        let user;
        if (body.action === 'register') {
            assert(password.length >= 8, 'Password minimal 8 karakter.');
            const existing = await pool.query('SELECT id FROM profiles WHERE lower(email)=$1', [email]);
            assert(!existing.rows[0], 'Email sudah terdaftar.', 409);
            const hashed = await bcrypt.hash(password, 12);
            user = await atomic(async (client) => {
                await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [email]);
                const check = await client.query('SELECT id FROM profiles WHERE lower(email)=$1', [email]);
                assert(!check.rows[0], 'Email sudah terdaftar.', 409);
                const result = await client.query('INSERT INTO profiles(email,password,full_name,currency) VALUES($1,$2,$3,$4) RETURNING ' + PROFILE_COLUMNS, [email, hashed, body.full_name ? text(body.full_name) : email.split('@')[0], 'IDR']);
                await client.query("INSERT INTO accounts(user_id,name,type,icon,color,initial_balance) VALUES($1,'Rekening Bank','bank','landmark','#52613d',0),($1,'E-Wallet','ewallet','smartphone','#52613d',0),($1,'Dompet Tunai','cash','banknote','#52613d',0)", [result.rows[0].id]);
                return result.rows[0];
            });
        }
        else {
            const result = await pool.query('SELECT ' + PROFILE_COLUMNS + ',password FROM profiles WHERE lower(email)=$1', [email]);
            const record = result.rows[0];
            const match = record?.password?.startsWith('$2') ? await bcrypt.compare(password, record.password) : Boolean(record?.password && record.password === password);
            assert(match, 'Email atau password salah.', 401);
            if (!record.password.startsWith('$2'))
                await pool.query('UPDATE profiles SET password=$1 WHERE id=$2', [await bcrypt.hash(password, 12), record.id]);
            const { password: omitted, ...safe } = record;
            void omitted;
            user = safe;
        }
        await createSession(user.id, req);
        await pool.query('DELETE FROM auth_attempts WHERE key=$1', [attemptKey]);
        return Response.json({ success: true, user }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        return failure(error);
    }
}
