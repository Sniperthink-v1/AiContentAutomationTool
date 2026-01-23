import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

// GET /api/instagram/status - Check Instagram connection status
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated', connected: false },
        { status: 401 }
      );
    }

    // Check for Instagram integration in database
    const result = await pool.query(
      `SELECT platform_username, platform_user_id, token_expires_at, is_active
       FROM social_integrations 
       WHERE user_id = $1 AND platform = 'instagram' AND is_active = true`,
      [user.id]
    );

    if (result.rows.length > 0) {
      const integration = result.rows[0];
      const now = new Date();
      const expiresAt = new Date(integration.token_expires_at);
      
      // Check if token is still valid
      if (expiresAt > now) {
        return NextResponse.json({
          success: true,
          connected: true,
          username: integration.platform_username,
          expiresAt: integration.token_expires_at
        });
      } else {
        // Token expired - mark as inactive
        await pool.query(
          "UPDATE social_integrations SET is_active = false WHERE user_id = $1 AND platform = 'instagram'",
          [user.id]
        );
        
        return NextResponse.json({
          success: true,
          connected: false,
          error: 'Instagram token expired - please reconnect'
        });
      }
    }

    return NextResponse.json({
      success: true,
      connected: false
    });

  } catch (error) {
    console.error('Instagram status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check Instagram status', connected: false },
      { status: 500 }
    );
  }
}
