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
      'SELECT * FROM emergency_funds WHERE user_id = $1',
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0] || null
    });
  } catch (error: any) {
    console.error('GET /api/emergency-fund error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, profile_type, monthly_expense, target_months, selected_account_ids } = body;

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO emergency_funds (user_id, profile_type, monthly_expense, target_months, selected_account_ids, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET 
          profile_type = EXCLUDED.profile_type,
          monthly_expense = EXCLUDED.monthly_expense,
          target_months = EXCLUDED.target_months,
          selected_account_ids = EXCLUDED.selected_account_ids,
          updated_at = NOW()
       RETURNING *`,
      [user_id, profile_type || 'single', monthly_expense || 3000000, target_months || 3, selected_account_ids || []]
    );

    return NextResponse.json({
      success: true,
      data: res.rows[0]
    });
  } catch (error: any) {
    console.error('POST /api/emergency-fund error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
