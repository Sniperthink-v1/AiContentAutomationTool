import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import pool from '@/lib/db';
import { getInstagramAccessToken } from '@/lib/instagram';

// GET - Fetch all auto-DM rules for the user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT id, keyword, dm_message, media_id, is_active, created_at, updated_at
       FROM auto_dm_rules 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      rules: result.rows,
    });
  } catch (error) {
    console.error('Error fetching auto-DM rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

// POST - Create new auto-DM rule
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Instagram credentials
    const tokenData = await getInstagramAccessToken(user.id);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Instagram not connected. Please connect your Instagram account first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { keyword, dmMessage, mediaId } = body;

    if (!keyword || !dmMessage) {
      return NextResponse.json(
        { error: 'Keyword and DM message are required' },
        { status: 400 }
      );
    }

    // Insert rule
    const result = await pool.query(
      `INSERT INTO auto_dm_rules (user_id, ig_user_id, keyword, dm_message, media_id, access_token, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, keyword, dm_message, media_id, is_active, created_at`,
      [user.id, tokenData.igUserId, keyword, dmMessage, mediaId || null, tokenData.accessToken]
    );

    return NextResponse.json({
      success: true,
      rule: result.rows[0],
      message: 'Auto-DM rule created successfully',
    });
  } catch (error) {
    console.error('Error creating auto-DM rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}

// PUT - Update auto-DM rule
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ruleId, keyword, dmMessage, mediaId, isActive } = body;

    if (!ruleId) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    // Update rule
    const result = await pool.query(
      `UPDATE auto_dm_rules 
       SET keyword = COALESCE($1, keyword),
           dm_message = COALESCE($2, dm_message),
           media_id = COALESCE($3, media_id),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, keyword, dm_message, media_id, is_active, updated_at`,
      [keyword, dmMessage, mediaId, isActive, ruleId, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rule: result.rows[0],
      message: 'Auto-DM rule updated successfully',
    });
  } catch (error) {
    console.error('Error updating auto-DM rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

// DELETE - Delete auto-DM rule
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'DELETE FROM auto_dm_rules WHERE id = $1 AND user_id = $2',
      [ruleId, user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-DM rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting auto-DM rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
