import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/auth/instagram/data-deletion
// Facebook will call this when a user requests data deletion
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
        // Log the data deletion request
        console.log(`User ${userId} requested data deletion`);
        
        const client = await pool.connect();
        try {
          // Delete user's Instagram-related data
          // Adjust based on your database schema
          await client.query(
            'DELETE FROM ai_images WHERE user_id IN (SELECT id FROM users WHERE instagram_user_id = $1)',
            [userId]
          );
          
          await client.query(
            'DELETE FROM ai_videos WHERE user_id IN (SELECT id FROM users WHERE instagram_user_id = $1)',
            [userId]
          );
          
          await client.query(
            'DELETE FROM drafts WHERE user_id IN (SELECT id FROM users WHERE instagram_user_id = $1)',
            [userId]
          );
          
          // Update user record to remove Instagram data
          await client.query(
            'UPDATE users SET instagram_token = NULL, instagram_user_id = NULL WHERE instagram_user_id = $1',
            [userId]
          );
          
          console.log(`Data deletion completed for user ${userId}`);
        } finally {
          client.release();
        }
      }
    }

    // Return confirmation URL (required by Facebook)
    return NextResponse.json({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/data-deletion-confirmation`,
      confirmation_code: `delete_${Date.now()}`
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    return NextResponse.json(
      { error: 'Data deletion failed' },
      { status: 500 }
    );
  }
}

// GET handler for testing
export async function GET() {
  return NextResponse.json({
    message: 'Data deletion endpoint is active',
    status: 'ok'
  });
}
