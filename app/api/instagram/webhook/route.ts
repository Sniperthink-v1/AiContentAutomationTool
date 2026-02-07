import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';

const APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';

// Verify webhook signature from Meta
function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');
  return `sha256=${expectedSignature}` === signature;
}

// GET - Webhook verification (Meta requires this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token should match your custom token
  const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'my_secure_token_123';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('❌ Webhook verification failed');
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }
}

// POST - Receive webhook notifications from Instagram
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';

    // Verify the request is from Meta
    if (!verifySignature(body, signature)) {
      console.error('❌ Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const data = JSON.parse(body);
    console.log('📬 Webhook received:', JSON.stringify(data, null, 2));

    // Process each entry
    for (const entry of data.entry || []) {
      for (const change of entry.changes || []) {
        // Check if it's a comment
        if (change.field === 'comments' && change.value) {
          const comment = change.value;
          
          // Extract comment data
          const commentId = comment.id;
          const commentText = comment.text || '';
          const mediaId = comment.media?.id;
          const commenterId = comment.from?.id;
          const commenterUsername = comment.from?.username;

          console.log(`💬 New comment from @${commenterUsername}: "${commentText}"`);

          // Check for keywords and send auto-DM
          await processCommentForKeywords({
            commentId,
            commentText,
            mediaId,
            commenterId,
            commenterUsername,
            igUserId: entry.id, // The Instagram Business Account ID
          });
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

// Process comment and check for trigger keywords
async function processCommentForKeywords(data: {
  commentId: string;
  commentText: string;
  mediaId: string;
  commenterId: string;
  commenterUsername: string;
  igUserId: string;
}) {
  try {
    // Get keyword rules from database - either global or specific to this media
    const rulesResult = await pool.query(
      `SELECT keyword, dm_message, access_token, media_id 
       FROM auto_dm_rules 
       WHERE ig_user_id = $1 AND is_active = true 
       AND (media_id IS NULL OR media_id = $2)`,
      [data.igUserId, data.mediaId]
    );

    const rules = rulesResult.rows;
    if (rules.length === 0) {
      console.log('No active auto-DM rules found');
      return;
    }

    // Check if comment contains any trigger keywords
    const commentLower = data.commentText.toLowerCase();
    
    for (const rule of rules) {
      const keyword = rule.keyword.toLowerCase();
      
      if (commentLower.includes(keyword)) {
        console.log(`🎯 Keyword "${keyword}" detected! Sending auto-DM...`);
        
        // Send DM to commenter
        await sendDirectMessage(
          data.igUserId,
          data.commenterId,
          rule.dm_message,
          rule.access_token
        );

        // Log the auto-reply
        await pool.query(
          `INSERT INTO auto_dm_logs 
           (ig_user_id, comment_id, commenter_id, commenter_username, keyword, dm_message, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            data.igUserId,
            data.commentId,
            data.commenterId,
            data.commenterUsername,
            keyword,
            rule.dm_message
          ]
        );

        console.log(`✅ Auto-DM sent to @${data.commenterUsername}`);
        break; // Only send one DM per comment
      }
    }
  } catch (error) {
    console.error('❌ Error processing comment for keywords:', error);
  }
}

// Send direct message via Instagram API
async function sendDirectMessage(
  igUserId: string,
  recipientId: string,
  message: string,
  accessToken: string
): Promise<void> {
  const GRAPH_API_VERSION = 'v24.0';
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message: {
        text: message,
      },
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Failed to send DM:', error);
    throw new Error(error.error?.message || 'Failed to send DM');
  }

  console.log('✅ DM sent successfully');
}
