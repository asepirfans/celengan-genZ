import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, category_id, month, year, amount } = body;

    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, month, year, amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, category_id, month, year)
       DO UPDATE SET amount = EXCLUDED.amount
       RETURNING *`,
      [user_id, category_id, month, year, amount]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('API /api/budgets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await pool.query('DELETE FROM budgets WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/budgets error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
