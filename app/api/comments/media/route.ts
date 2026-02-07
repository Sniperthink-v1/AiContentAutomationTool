import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInstagramMedia } from '@/lib/instagram';
import { getAuthUser } from '@/lib/middleware';
import pool from '@/lib/db';

// GET - Fetch user's media for comment management
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    let accessToken = cookieStore.get('ig_access_token')?.value;
    let igUserId = cookieStore.get('ig_user_id')?.value;

    // If not in cookies, try to get from database
    if (!accessToken || !igUserId) {
      const result = await pool.query(
        `SELECT access_token, platform_user_id, token_expires_at, is_active
         FROM social_integrations
         WHERE user_id = $1 AND platform = 'instagram'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [user.id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return NextResponse.json(
          { error: 'Instagram account not connected. Please connect in Settings.' },
          { status: 401 }
        );
      }

      const integration = result.rows[0];
      
      // Check if token is expired
      if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Instagram token expired. Please reconnect in Settings.' },
          { status: 401 }
        );
      }

      accessToken = integration.access_token;
      igUserId = integration.platform_user_id;
    }

    // Final check to ensure both values exist
    if (!accessToken || !igUserId) {
      return NextResponse.json(
        { error: 'Instagram account not properly configured. Please reconnect in Settings.' },
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
