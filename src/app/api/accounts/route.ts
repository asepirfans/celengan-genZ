import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, name, type, icon, color, initial_balance } = body;

    const result = await pool.query(
      `INSERT INTO accounts 
       (user_id, name, type, icon, color, initial_balance) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, name, type, icon, color, initial_balance || 0]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('API /api/accounts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, type, icon, color, initial_balance } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE accounts 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           icon = COALESCE($3, icon),
           color = COALESCE($4, color),
           initial_balance = COALESCE($5, initial_balance)
       WHERE id = $6 RETURNING *`,
      [name, type, icon, color, initial_balance, id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('API PUT /api/accounts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/accounts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
