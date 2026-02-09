import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Test endpoint to check webhook status and recent webhook calls
export async function GET(request: NextRequest) {
  try {
    // Check if webhook tables exist
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'webhook_logs'
      );
    `);

    let webhookLogs = [];
    
    if (tableCheck.rows[0].exists) {
      // Get recent webhook logs
      const logs = await pool.query(`
        SELECT * FROM webhook_logs 
        ORDER BY received_at DESC 
        LIMIT 10
      `);
      webhookLogs = logs.rows;
    } else {
      // Create webhook logs table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id SERIAL PRIMARY KEY,
          event_type TEXT,
          payload JSONB,
          received_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    return NextResponse.json({
      success: true,
      webhookConfigured: webhookLogs.length > 0,
      recentWebhooks: webhookLogs,
      message: webhookLogs.length === 0 
        ? 'No webhook calls received yet. Configure webhook in Meta Developer Console.'
        : `Received ${webhookLogs.length} webhook calls`,
      instructions: {
        callbackUrl: 'https://contentautomation.sniperthink.com/api/instagram/webhook',
        verifyToken: 'sniperthink_secure_webhook_token_2026',
        setupUrl: 'https://developers.facebook.com/apps/865080999545998/webhooks/'
      }
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
