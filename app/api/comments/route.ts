import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getComments, replyToComment, deleteComment } from '@/lib/instagram';

// GET - Fetch comments for a media
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ig_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
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
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ig_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
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
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ig_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
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
