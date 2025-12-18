import { NextRequest, NextResponse } from 'next/server';
import { getInstagramAuthUrl } from '@/lib/instagram';

// GET /api/auth/instagram - Redirect to Instagram OAuth
export async function GET(request: NextRequest) {
  try {
    const authUrl = getInstagramAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Instagram auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Instagram login' },
      { status: 500 }
    );
  }
}
