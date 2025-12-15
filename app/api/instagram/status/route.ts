import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/instagram/status - Check if Instagram is connected
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('ig_access_token')?.value;
    const igUserId = cookieStore.get('ig_user_id')?.value;
    const igUsername = cookieStore.get('ig_username')?.value;

    if (!accessToken || !igUserId) {
      return NextResponse.json({
        connected: false,
        username: null,
      });
    }

    return NextResponse.json({
      connected: true,
      username: igUsername || null,
      userId: igUserId,
    });

  } catch (error) {
    console.error('Instagram status error:', error);
    return NextResponse.json({
      connected: false,
      username: null,
    });
  }
}
