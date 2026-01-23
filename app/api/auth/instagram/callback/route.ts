import { NextRequest, NextResponse } from 'next/server';
import { 
  exchangeCodeForToken, 
  getLongLivedToken, 
  getInstagramBusinessAccount,
  getInstagramProfile 
} from '@/lib/instagram';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

// GET /api/auth/instagram/callback - Handle OAuth callback
export async function GET(request: NextRequest) {
  // Use the public app URL for redirects (ngrok URL)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url;
  
  // Debug: Log environment variables at the start
  console.log('=== CALLBACK ROUTE START ===');
  console.log('ENV INSTAGRAM_REDIRECT_URI:', process.env.INSTAGRAM_REDIRECT_URI);
  console.log('ENV INSTAGRAM_APP_ID:', process.env.INSTAGRAM_APP_ID);
  console.log('Base URL for redirects:', baseUrl);
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
        new URL(`/dashboard/settings?error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=No authorization code received', baseUrl)
      );
    }

    console.log('Code received, attempting token exchange...');
    
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    console.log('Got short-lived token');

    // Get long-lived token (valid for 60 days)
    const longLivedToken = await getLongLivedToken(tokenData.access_token);
    console.log('Got long-lived token, expires in:', longLivedToken.expires_in, 'seconds');

    const expiresInSeconds = Number(longLivedToken.expires_in);
    if (!Number.isFinite(expiresInSeconds)) {
      console.error('Invalid expires_in from Instagram:', longLivedToken.expires_in);
      throw new Error('Invalid token expiry returned by Instagram');
    }

    // Get Instagram Business Account ID
    const igUserId = await getInstagramBusinessAccount(longLivedToken.access_token);
    
    if (!igUserId) {
      // More specific error message
      const errorMsg = encodeURIComponent(
        'No Instagram Business account found. This usually means: (1) You need to link your Instagram account to your Facebook Page in Instagram Settings > Account > Linked accounts, OR (2) You declined the "pages_show_list" permission during login. Please try again and accept ALL permissions.'
      );
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${errorMsg}`, baseUrl)
      );
    }

    // Get Instagram profile
    const profile = await getInstagramProfile(igUserId, longLivedToken.access_token);
    console.log('Connected Instagram account:', profile.username);

    // MUST have authenticated user for proper user-specific connections
    const user = await getAuthUser(request);
    
    if (!user) {
      console.error('No authenticated user found - cannot connect Instagram');
      return NextResponse.redirect(
        new URL('/login?error=Please login first to connect Instagram', baseUrl)
      );
    }

    // Check if this Instagram account is already connected to a DIFFERENT user
    const existingConnection = await pool.query(
      'SELECT user_id FROM social_integrations WHERE platform = \'instagram\' AND platform_user_id = $1 AND user_id != $2 AND is_active = true',
      [igUserId, user.id]
    );

    if (existingConnection.rows.length > 0) {
      const errorMsg = encodeURIComponent(
        `This Instagram account (@${profile.username}) is already connected to another user. Please disconnect it from the other account first, or use a different Instagram account.`
      );
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${errorMsg}`, baseUrl)
      );
    }

    // Save Instagram integration to database for this specific user
    // This will replace any existing connection for THIS user (allows fresh login)
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    
    await pool.query(
      `INSERT INTO social_integrations 
       (user_id, platform, access_token, token_expires_at, platform_user_id, platform_username, is_active)
       VALUES ($1, 'instagram', $2, $3, $4, $5, true)
       ON CONFLICT (user_id, platform) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         token_expires_at = EXCLUDED.token_expires_at,
         platform_user_id = EXCLUDED.platform_user_id,
         platform_username = EXCLUDED.platform_username,
         is_active = true,
         updated_at = NOW()`,
      [user.id, longLivedToken.access_token, expiresAt, igUserId, profile.username]
    );
    console.log('Instagram integration saved to database for user:', user.id, 'Instagram:', profile.username);

    const response = NextResponse.redirect(
      new URL(`/dashboard/settings?success=Connected to Instagram as @${profile.username}`, baseUrl)
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
      new URL(`/dashboard/settings?error=${encodeURIComponent(errorMessage)}`, baseUrl)
    );
  }
}
