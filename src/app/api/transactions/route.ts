import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, account_id, category_id, type, amount, note, date, transfer_to_account_id } = body;

    const result = await pool.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, type, amount, note, date, transfer_to_account_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user_id, account_id, category_id || null, type, amount, note || null, date || new Date().toISOString(), transfer_to_account_id || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('API /api/transactions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, account_id, category_id, type, amount, note, date, transfer_to_account_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE transactions 
       SET account_id = COALESCE($1, account_id),
           category_id = $2,
           type = COALESCE($3, type),
           amount = COALESCE($4, amount),
           note = $5,
           date = COALESCE($6, date),
           transfer_to_account_id = $7
       WHERE id = $8 RETURNING *`,
      [account_id, category_id || null, type, amount, note || null, date, transfer_to_account_id || null, id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('API PUT /api/transactions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/transactions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
