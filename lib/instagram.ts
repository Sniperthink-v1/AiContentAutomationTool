// Instagram Graph API Integration
// Documentation: https://developers.facebook.com/docs/instagram-api

import pool from './db';

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface InstagramConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  accessToken?: string;
}

export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramInsights {
  impressions?: number;
  reach?: number;
  engagement?: number;
  followers_count?: number;
  profile_views?: number;
}

// Get Instagram access token for a specific user from database
export async function getInstagramAccessToken(userId: string): Promise<{ accessToken: string; igUserId: string } | null> {
  try {
    const result = await pool.query(
      `SELECT access_token, platform_user_id, token_expires_at 
       FROM social_integrations 
       WHERE user_id = $1 AND platform = 'instagram' AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const integration = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(integration.token_expires_at);

    // Check if token is expired
    if (expiresAt <= now) {
      console.error('Instagram token expired for user:', userId);
      // Mark as inactive
      await pool.query(
        "UPDATE social_integrations SET is_active = false WHERE user_id = $1 AND platform = 'instagram'",
        [userId]
      );
      return null;
    }

    return {
      accessToken: integration.access_token,
      igUserId: integration.platform_user_id
    };
  } catch (error) {
    console.error('Failed to get Instagram access token:', error);
    return null;
  }
}

// Get Instagram OAuth URL for login
export function getInstagramAuthUrl(): string {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  
  // Debug logging
  console.log('=== Instagram OAuth Debug ===');
  console.log('App ID:', appId);
  console.log('Redirect URI:', redirectUri);
  console.log('Encoded Redirect URI:', encodeURIComponent(redirectUri || ''));
  
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
    'business_management',
  ].join(',');

  // Generate random state for security
  const state = Math.random().toString(36).substring(2, 15);

  // Force Facebook to show ALL permissions dialog with rerequest
  const authUrl = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri || '')}` +
    `&scope=${scopes}` +
    `&response_type=code` +
    `&auth_type=rerequest` +
    `&state=${state}` +
    `&return_scopes=true`;
  
  console.log('Full Auth URL:', authUrl);
  
  return authUrl;
}

// Exchange code for access token
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  // Debug logging
  console.log('=== Token Exchange Debug ===');
  console.log('Redirect URI for token exchange:', redirectUri);
  console.log('Code received:', code?.substring(0, 20) + '...');

  const tokenUrl = `${GRAPH_API_BASE}/oauth/access_token?` +
    `client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&redirect_uri=${encodeURIComponent(redirectUri || '')}` +
    `&code=${code}`;
  
  console.log('Token URL (without secret):', tokenUrl.replace(appSecret || '', '***'));

  const response = await fetch(tokenUrl);

  if (!response.ok) {
    const error = await response.json();
    console.error('Token exchange error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || 'Failed to exchange code for token');
  }

  return response.json();
}

// Get long-lived access token (60 days)
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${shortLivedToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get long-lived token');
  }

  const data = await response.json();
  if (!Number.isFinite(Number(data.expires_in))) {
    // Default to 60 days if API omits expires_in.
    data.expires_in = 60 * 24 * 60 * 60;
    console.warn('Long-lived token missing expires_in, defaulting to 60 days');
  }
  return data;
}

// Get Instagram Business Account ID from Facebook Page
export async function getInstagramBusinessAccount(accessToken: string): Promise<string | null> {
  // First, get the Facebook Pages
  console.log('=== Getting Instagram Business Account ===');
  
  const pagesResponse = await fetch(
    `${GRAPH_API_BASE}/me/accounts?access_token=${accessToken}`
  );

  if (!pagesResponse.ok) {
    const error = await pagesResponse.json();
    console.error('Failed to fetch Facebook pages:', error);
    throw new Error('Failed to fetch Facebook pages');
  }

  const pagesData = await pagesResponse.json();
  console.log('Facebook Pages found:', pagesData.data?.length || 0);
  console.log('Pages data:', JSON.stringify(pagesData, null, 2));
  
  if (!pagesData.data || pagesData.data.length === 0) {
    console.log('No Facebook Pages found for this user');
    return null;
  }

  // Try to find Instagram Business Account from all pages
  for (const page of pagesData.data) {
    const pageId = page.id;
    const pageAccessToken = page.access_token;
    console.log(`Checking page: ${page.name} (ID: ${pageId})`);

    const igResponse = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );

    if (!igResponse.ok) {
      console.error(`Failed to fetch Instagram account for page ${pageId}`);
      continue;
    }

    const igData = await igResponse.json();
    console.log(`Page ${page.name} Instagram data:`, JSON.stringify(igData, null, 2));
    
    if (igData.instagram_business_account?.id) {
      console.log('Found Instagram Business Account:', igData.instagram_business_account.id);
      return igData.instagram_business_account.id;
    }
  }

  console.log('No Instagram Business Account found on any page');
  return null;
}

// Get Instagram User Profile
export async function getInstagramProfile(
  igUserId: string,
  accessToken: string
): Promise<InstagramUser> {
  const fields = 'id,username,name,profile_picture_url,followers_count,follows_count,media_count';
  
  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}?fields=${fields}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch profile');
  }

  return response.json();
}

// Get Instagram Media (posts)
export async function getInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit: number = 25
): Promise<InstagramMedia[]> {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
  
  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch media');
  }

  const data = await response.json();
  return data.data || [];
}

// Get Instagram Insights
export async function getInstagramInsights(
  igUserId: string,
  accessToken: string,
  period: 'day' | 'week' | 'days_28' = 'day'
): Promise<InstagramInsights> {
  const metrics = 'reach,profile_views,accounts_engaged';
  
  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}/insights?metric=${metrics}&period=${period}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch insights');
  }

  const data = await response.json();
  const insights: InstagramInsights = {};
  
  data.data?.forEach((item: any) => {
    const total = (item.values || []).reduce(
      (sum: number, entry: any) => sum + (Number(entry.value) || 0),
      0
    );
    if (item.name === 'reach') insights.reach = total;
    if (item.name === 'profile_views') insights.profile_views = total;
    if (item.name === 'accounts_engaged') insights.impressions = total;
  });

  return insights;
}

export async function getInstagramAudienceDemographics(
  igUserId: string,
  accessToken: string
): Promise<Array<{ age: string; male: number; female: number }>> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}/insights?metric=audience_gender_age&period=lifetime&access_token=${accessToken}`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const value = data?.data?.[0]?.values?.[0]?.value || {};

  const buckets: Record<string, { male: number; female: number }> = {
    '13-17': { male: 0, female: 0 },
    '18-24': { male: 0, female: 0 },
    '25-34': { male: 0, female: 0 },
    '35-44': { male: 0, female: 0 },
    '45-54': { male: 0, female: 0 },
    '55-64': { male: 0, female: 0 },
    '65+': { male: 0, female: 0 },
  };

  Object.entries(value).forEach(([key, count]) => {
    const [gender, age] = key.split('.');
    if (!gender || !age || !buckets[age]) {
      return;
    }
    if (gender === 'M') {
      buckets[age].male += Number(count) || 0;
    }
    if (gender === 'F') {
      buckets[age].female += Number(count) || 0;
    }
  });

  return Object.entries(buckets).map(([age, counts]) => ({
    age,
    male: counts.male,
    female: counts.female,
  }));
}

// ==================== POSTING CONTENT ====================

// Step 1: Create a media container (for single image/video)
export async function createMediaContainer(
  igUserId: string,
  accessToken: string,
  options: {
    imageUrl?: string;      // For images
    videoUrl?: string;      // For videos/reels
    caption?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'REELS';
    coverUrl?: string;      // For reels cover image
    shareToFeed?: boolean;  // For reels
  }
): Promise<string> {
  const params = new URLSearchParams();
  params.append('access_token', accessToken);
  
  if (options.caption) {
    params.append('caption', options.caption);
  }

  if (options.imageUrl) {
    params.append('image_url', options.imageUrl);
  } else if (options.videoUrl) {
    params.append('video_url', options.videoUrl);
    params.append('media_type', options.mediaType || 'REELS');
    
    if (options.coverUrl) {
      params.append('cover_url', options.coverUrl);
    }
    if (options.shareToFeed !== undefined) {
      params.append('share_to_feed', String(options.shareToFeed));
    }
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Instagram API Error (Create Container):', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || 'Failed to create media container');
  }

  const data = await response.json();
  console.log('✅ Media container created:', data);
  return data.id; // Container ID
}

// Step 2: Check media container status (for videos)
export async function checkMediaStatus(
  containerId: string,
  accessToken: string
): Promise<{ status: string; status_code?: string }> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${containerId}?fields=status,status_code&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to check media status');
  }

  return response.json();
}

// Step 3: Publish the media container
export async function publishMedia(
  igUserId: string,
  containerId: string,
  accessToken: string
): Promise<string> {
  const params = new URLSearchParams();
  params.append('creation_id', containerId);
  params.append('access_token', accessToken);

  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}/media_publish`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Instagram API Error (Publish Media):', JSON.stringify(error, null, 2));
    console.error('Container ID used:', containerId);
    throw new Error(error.error?.message || 'Failed to publish media');
  }

  const data = await response.json();
  console.log('✅ Media published successfully:', data);
  return data.id; // Published media ID
}

// Helper: Post an image to Instagram
export async function postImage(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption?: string
): Promise<string> {
  // Create container
  const containerId = await createMediaContainer(igUserId, accessToken, {
    imageUrl,
    caption,
  });

  // Publish immediately (images don't need status check)
  const mediaId = await publishMedia(igUserId, containerId, accessToken);
  return mediaId;
}

// Helper: Post a video/reel to Instagram
export async function postVideo(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption?: string,
  isReel: boolean = true
): Promise<string> {
  // Create container
  const containerId = await createMediaContainer(igUserId, accessToken, {
    videoUrl,
    caption,
    mediaType: isReel ? 'REELS' : 'VIDEO',
    shareToFeed: true,
  });

  // Wait for video processing
  let status = await checkMediaStatus(containerId, accessToken);
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max

  while (status.status_code !== 'FINISHED' && attempts < maxAttempts) {
    if (status.status_code === 'ERROR') {
      throw new Error('Video processing failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    status = await checkMediaStatus(containerId, accessToken);
    attempts++;
  }

  if (status.status_code !== 'FINISHED') {
    throw new Error('Video processing timed out');
  }

  // Publish
  const mediaId = await publishMedia(igUserId, containerId, accessToken);
  return mediaId;
}

// Create carousel post (multiple images/videos)
export async function postCarousel(
  igUserId: string,
  accessToken: string,
  items: Array<{ imageUrl?: string; videoUrl?: string }>,
  caption?: string
): Promise<string> {
  // Create containers for each item
  const childIds: string[] = [];

  for (const item of items) {
    const params = new URLSearchParams();
    params.append('access_token', accessToken);
    params.append('is_carousel_item', 'true');

    if (item.imageUrl) {
      params.append('image_url', item.imageUrl);
    } else if (item.videoUrl) {
      params.append('video_url', item.videoUrl);
      params.append('media_type', 'VIDEO');
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/media`,
      {
        method: 'POST',
        body: params,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create carousel item');
    }

    const data = await response.json();
    childIds.push(data.id);
  }

  // Create carousel container
  const params = new URLSearchParams();
  params.append('access_token', accessToken);
  params.append('media_type', 'CAROUSEL');
  params.append('children', childIds.join(','));
  if (caption) {
    params.append('caption', caption);
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create carousel');
  }

  const carouselData = await response.json();

  // Publish carousel
  const mediaId = await publishMedia(igUserId, carouselData.id, accessToken);
  return mediaId;
}

// Post a story
export async function postStory(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  isVideo: boolean = false
): Promise<string> {
  const params = new URLSearchParams();
  params.append('access_token', accessToken);
  
  if (isVideo) {
    params.append('video_url', mediaUrl);
    params.append('media_type', 'STORIES');
  } else {
    params.append('image_url', mediaUrl);
    params.append('media_type', 'STORIES');
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create story');
  }

  const data = await response.json();
  
  // For stories, might need to wait for processing if video
  if (isVideo) {
    let status = await checkMediaStatus(data.id, accessToken);
    let attempts = 0;
    while (status.status_code !== 'FINISHED' && attempts < 30) {
      if (status.status_code === 'ERROR') {
        throw new Error('Story video processing failed');
      }
      await new Promise(resolve => setTimeout(resolve, 10000));
      status = await checkMediaStatus(data.id, accessToken);
      attempts++;
    }
  }

  // Publish story
  const mediaId = await publishMedia(igUserId, data.id, accessToken);
  return mediaId;
}

// ==================== COMMENTS ====================

// Get comments on a media
export async function getComments(
  mediaId: string,
  accessToken: string
): Promise<Array<{ id: string; text: string; username: string; timestamp: string }>> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch comments');
  }

  const data = await response.json();
  return data.data || [];
}

// Reply to a comment
export async function replyToComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<string> {
  const params = new URLSearchParams();
  params.append('message', message);
  params.append('access_token', accessToken);

  const response = await fetch(
    `${GRAPH_API_BASE}/${commentId}/replies`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to reply to comment');
  }

  const data = await response.json();
  return data.id;
}

// Delete a comment
export async function deleteComment(
  commentId: string,
  accessToken: string
): Promise<boolean> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${commentId}?access_token=${accessToken}`,
    {
      method: 'DELETE',
    }
  );

  return response.ok;
}
