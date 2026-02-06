import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getComments, replyToComment, deleteComment } from '@/lib/instagram';
import { getAuthUser } from '@/lib/middleware';
import pool from '@/lib/db';

// Helper function to get Instagram credentials
async function getInstagramCredentials(userId: string) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('ig_access_token')?.value;

  // If not in cookies, try database
  if (!accessToken) {
    const result = await pool.query(
      `SELECT access_token, token_expires_at, is_active
       FROM social_integrations
       WHERE user_id = $1 AND platform = 'instagram'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return null;
    }

    const integration = result.rows[0];
    
    // Check if token is expired
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      return null;
    }

    accessToken = integration.access_token;
  }

  return accessToken;
}

// GET - Fetch comments for a media
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = await getInstagramCredentials(user.id);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect in Settings.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const comments = await getComments(mediaId, accessToken);

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Reply to a comment
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = await getInstagramCredentials(user.id);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect in Settings.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { commentId, message } = body;

    if (!commentId || !message) {
      return NextResponse.json(
        { error: 'Comment ID and message are required' },
        { status: 400 }
      );
    }

    const replyId = await replyToComment(commentId, message, accessToken);

    return NextResponse.json({
      success: true,
      replyId,
      message: 'Reply posted successfully',
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = await getInstagramCredentials(user.id);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect in Settings.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const success = await deleteComment(commentId, accessToken);

    return NextResponse.json({
      success,
      message: success ? 'Comment deleted successfully' : 'Failed to delete comment',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
