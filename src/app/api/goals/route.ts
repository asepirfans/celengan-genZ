import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const res = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error('GET /api/goals error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, title, target_amount, current_amount = 0, target_date, icon = 'sparkles', color = '#38BDF8', image_url } = body;

    if (!user_id || !title || !target_amount) {
      return NextResponse.json({ success: false, error: 'Title, user_id, and target_amount are required' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO savings_goals (user_id, title, target_amount, current_amount, target_date, icon, color, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, title, target_amount, current_amount, target_date || null, icon, color, image_url || null]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    console.error('POST /api/goals error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, target_amount, current_amount, target_date, icon, color, image_url } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Goal ID is required' }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE savings_goals
       SET title = COALESCE($1, title),
           target_amount = COALESCE($2, target_amount),
           current_amount = COALESCE($3, current_amount),
           target_date = COALESCE($4, target_date),
           icon = COALESCE($5, icon),
           color = COALESCE($6, color),
           image_url = COALESCE($7, image_url)
       WHERE id = $8
       RETURNING *`,
      [title, target_amount, current_amount, target_date, icon, color, image_url, id]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    console.error('PUT /api/goals error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await pool.query('DELETE FROM savings_goals WHERE id = $1', [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/goals error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
