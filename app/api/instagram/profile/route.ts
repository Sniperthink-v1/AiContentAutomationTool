import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInstagramProfile, getInstagramMedia, getInstagramInsights } from '@/lib/instagram';

// GET /api/instagram/profile - Get connected Instagram profile
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ig_access_token')?.value;
    const igUserId = cookieStore.get('ig_user_id')?.value;

    if (!accessToken || !igUserId) {
      return NextResponse.json(
        { error: 'Instagram account not connected', connected: false },
        { status: 401 }
      );
    }

    // Get profile info
    const profile = await getInstagramProfile(igUserId, accessToken);

    // Get recent media
    const media = await getInstagramMedia(igUserId, accessToken, 10);

    // Get insights (may fail if not enough data)
    let insights = null;
    try {
      insights = await getInstagramInsights(igUserId, accessToken, 'day');
    } catch (e) {
      console.log('Could not fetch insights:', e);
    }

    return NextResponse.json({
      success: true,
      connected: true,
      profile,
      recentMedia: media,
      insights,
    });

  } catch (error) {
    console.error('Instagram profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // If token is invalid, return not connected
    if (errorMessage.includes('token') || errorMessage.includes('expired')) {
      return NextResponse.json(
        { error: 'Instagram token expired. Please reconnect.', connected: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
