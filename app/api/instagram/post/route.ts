import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { postImage, postVideo, postStory, postCarousel } from '@/lib/instagram';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ig_access_token')?.value;
    const igUserId = cookieStore.get('ig_user_id')?.value;

    if (!accessToken || !igUserId) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect your account in Settings.' },
        { status: 401 }
      );
    }

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
