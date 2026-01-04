import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/auth/instagram/deauthorize
// Facebook will call this when a user deauthorizes your app
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signed_request } = body;

    // Parse the signed request from Facebook
    // Format: encoded_sig.payload
    if (signed_request) {
      const [encodedSig, payload] = signed_request.split('.');
      const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      
      const userId = data.user_id;
      
      if (userId) {
        // Log the deauthorization
        console.log(`User ${userId} deauthorized the app`);
        
        // Optional: Remove user's Instagram token from database
        const client = await pool.connect();
        try {
          await client.query(
            'UPDATE users SET instagram_token = NULL, instagram_user_id = NULL WHERE instagram_user_id = $1',
            [userId]
          );
        } finally {
          client.release();
        }
      }
    }

    // Return confirmation URL (required by Facebook)
    return NextResponse.json({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/deauthorize-confirmation`,
      confirmation_code: `confirm_${Date.now()}`
    });
  } catch (error) {
    console.error('Deauthorize error:', error);
    return NextResponse.json(
      { error: 'Deauthorization failed' },
      { status: 500 }
    );
  }
}

// GET handler for testing
export async function GET() {
  return NextResponse.json({
    message: 'Deauthorize endpoint is active',
    status: 'ok'
  });
}
