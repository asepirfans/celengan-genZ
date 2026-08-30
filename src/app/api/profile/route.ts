import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, full_name, avatar_url, currency } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE profiles
       SET full_name = COALESCE($1, full_name),
           avatar_url = $2,
           currency = COALESCE($3, currency)
       WHERE id = $4
       RETURNING id, email, full_name, avatar_url, currency, created_at`,
      [full_name, avatar_url, currency, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0]
    });
  } catch (error: any) {
    console.error('API /api/profile error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
