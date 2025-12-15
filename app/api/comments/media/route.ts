import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInstagramMedia } from '@/lib/instagram';

// GET - Fetch user's media for comment management
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ig_access_token')?.value;
    const igUserId = cookieStore.get('ig_user_id')?.value;

    if (!accessToken || !igUserId) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const media = await getInstagramMedia(igUserId, accessToken, limit);

    return NextResponse.json({
      success: true,
      media,
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
