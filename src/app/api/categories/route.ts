import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, name, icon, color, type } = body;

    const result = await pool.query(
      `INSERT INTO categories (user_id, name, icon, color, type, is_default)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [user_id || null, name, icon, color, type]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('API /api/categories error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/categories error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
