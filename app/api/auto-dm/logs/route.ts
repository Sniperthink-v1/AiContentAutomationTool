import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import pool from '@/lib/db';
import { getInstagramAccessToken } from '@/lib/instagram';

// GET - Fetch auto-DM logs
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Instagram ID
    const tokenData = await getInstagramAccessToken(user.id);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Instagram not connected' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await pool.query(
      `SELECT id, comment_id, commenter_id, commenter_username, keyword, dm_message, sent_at
       FROM auto_dm_logs 
       WHERE ig_user_id = $1
       ORDER BY sent_at DESC
       LIMIT $2 OFFSET $3`,
      [tokenData.igUserId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM auto_dm_logs WHERE ig_user_id = $1',
      [tokenData.igUserId]
    );

    return NextResponse.json({
      success: true,
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching auto-DM logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
