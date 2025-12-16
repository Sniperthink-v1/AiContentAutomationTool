import { NextRequest, NextResponse } from 'next/server';
import { 
  exchangeCodeForToken, 
  getLongLivedToken, 
  getInstagramBusinessAccount,
  getInstagramProfile 
} from '@/lib/instagram';

// GET /api/auth/instagram/callback - Handle OAuth callback
export async function GET(request: NextRequest) {
  // Debug: Log environment variables at the start
  console.log('=== CALLBACK ROUTE START ===');
  console.log('ENV INSTAGRAM_REDIRECT_URI:', process.env.INSTAGRAM_REDIRECT_URI);
  console.log('ENV INSTAGRAM_APP_ID:', process.env.INSTAGRAM_APP_ID);
  console.log('Request URL:', request.url);
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=No authorization code received', request.url)
      );
    }

    console.log('Code received, attempting token exchange...');
    
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    console.log('Got short-lived token');

    // Get long-lived token (valid for 60 days)
    const longLivedToken = await getLongLivedToken(tokenData.access_token);
    console.log('Got long-lived token, expires in:', longLivedToken.expires_in, 'seconds');

    // Get Instagram Business Account ID
    const igUserId = await getInstagramBusinessAccount(longLivedToken.access_token);
    
    if (!igUserId) {
      // More specific error message
      const errorMsg = encodeURIComponent(
        'No Instagram Business account found. This usually means: (1) You need to link your Instagram account to your Facebook Page in Instagram Settings > Account > Linked accounts, OR (2) You declined the "pages_show_list" permission during login. Please try again and accept ALL permissions.'
      );
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${errorMsg}`, request.url)
      );
    }

    // Get Instagram profile
    const profile = await getInstagramProfile(igUserId, longLivedToken.access_token);
    console.log('Connected Instagram account:', profile.username);

    // TODO: Save to database
    // For now, we'll store in a cookie (in production, save to database)
    const response = NextResponse.redirect(
      new URL(`/dashboard/settings?success=Connected to Instagram as @${profile.username}`, request.url)
    );

    // Set cookies with Instagram data (in production, store in database instead)
    response.cookies.set('ig_access_token', longLivedToken.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: longLivedToken.expires_in, // ~60 days
    });

    response.cookies.set('ig_user_id', igUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: longLivedToken.expires_in,
    });

    response.cookies.set('ig_username', profile.username, {
      httpOnly: false, // Allow client-side access for display
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: longLivedToken.expires_in,
    });

    return response;

  } catch (error) {
    console.error('Instagram callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
