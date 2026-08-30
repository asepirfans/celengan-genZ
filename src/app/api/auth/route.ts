import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, full_name, currency = 'IDR' } = body;

    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
      return NextResponse.json({ success: false, error: 'Email dan password wajib diisi!' }, { status: 400 });
    }

    if (action === 'register') {
      // Check if email already exists
      const checkRes = await pool.query('SELECT * FROM profiles WHERE email = $1', [normalizedEmail]);
      if (checkRes.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'Email ini sudah terdaftar. Silakan login!' }, { status: 400 });
      }

      // Hash password securely with bcrypt (salt rounds = 10)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new profile user with hashed password
      const name = full_name?.trim() || normalizedEmail.split('@')[0];
      const insertRes = await pool.query(
        `INSERT INTO profiles (email, password, full_name, currency, avatar_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, currency, avatar_url, created_at`,
        [normalizedEmail, hashedPassword, name, currency, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80']
      );

      const newUser = insertRes.rows[0];

      // Auto create default accounts for this new user in Supabase
      await pool.query(`
        INSERT INTO accounts (user_id, name, type, icon, color, initial_balance) VALUES
        ($1, 'Rekening Bank', 'bank', 'landmark', '#00529C', 0),
        ($1, 'E-Wallet / GoPay', 'ewallet', 'smartphone', '#00AED6', 0),
        ($1, 'Dompet Tunai', 'cash', 'banknote', '#38BDF8', 0)
      `, [newUser.id]);

      return NextResponse.json({ 
        success: true, 
        message: 'Registrasi berhasil!', 
        user: newUser 
      });
    }

    if (action === 'login') {
      // Find user by email in database
      const userRes = await pool.query('SELECT * FROM profiles WHERE email = $1', [normalizedEmail]);
      
      if (userRes.rows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Akun belum terdaftar! Silakan lakukan Registrasi terlebih dahulu.' 
        }, { status: 404 });
      }

      const user = userRes.rows[0];

      // Compare password with bcrypt hash (or fallback for older plain text rows)
      let isMatch = false;
      if (user.password?.startsWith('$2a$') || user.password?.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = user.password === password;
        // Upgrade legacy plain password to bcrypt hash on login
        if (isMatch) {
          const salt = await bcrypt.genSalt(10);
          const newHashed = await bcrypt.hash(password, salt);
          await pool.query('UPDATE profiles SET password = $1 WHERE id = $2', [newHashed, user.id]);
        }
      }

      if (!isMatch) {
        return NextResponse.json({ 
          success: false, 
          error: 'Kata sandi salah. Silakan coba lagi!' 
        }, { status: 401 });
      }

      // Return user without leaking password hash
      const { password: _, ...safeUser } = user;

      return NextResponse.json({ 
        success: true, 
        message: 'Login berhasil!', 
        user: safeUser 
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/auth error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
