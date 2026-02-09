import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { postImage, postVideo, postStory, postCarousel } from '@/lib/instagram';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in.' },
        { status: 401 }
      );
    }

    // Get Instagram access token from database
    const result = await pool.query(
      `SELECT access_token, platform_user_id, token_expires_at, is_active
       FROM social_integrations 
       WHERE user_id = $1 AND platform = 'instagram' AND is_active = true`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect your account in Settings.' },
        { status: 401 }
      );
    }

    const integration = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);
    
    // Check if token is still valid
    if (expiresAt <= now) {
      return NextResponse.json(
        { error: 'Instagram token expired. Please reconnect your account in Settings.' },
        { status: 401 }
      );
    }

    const accessToken = integration.access_token;
    const igUserId = integration.platform_user_id;

    const body = await request.json();
    const { type, mediaUrl, caption, items, isVideo } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Post type is required (image, video, reel, story, carousel)' },
        { status: 400 }
      );
    }

    let mediaId: string;

    switch (type) {
      case 'image':
        if (!mediaUrl) {
          return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
        }
        mediaId = await postImage(igUserId, accessToken, mediaUrl, caption);
        break;

      case 'video':
      case 'reel':
        if (!mediaUrl) {
          return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
        }
        mediaId = await postVideo(igUserId, accessToken, mediaUrl, caption, type === 'reel');
        break;

      case 'story':
        if (!mediaUrl) {
          return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
        }
        mediaId = await postStory(igUserId, accessToken, mediaUrl, isVideo || false);
        break;

      case 'carousel':
        if (!items || !Array.isArray(items) || items.length < 2) {
          return NextResponse.json(
            { error: 'Carousel requires at least 2 items' },
            { status: 400 }
          );
        }
        mediaId = await postCarousel(igUserId, accessToken, items, caption);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid post type. Use: image, video, reel, story, or carousel' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      mediaId,
      message: `Successfully posted ${type} to Instagram`,
    });

  } catch (error) {
    console.error('Instagram post error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
