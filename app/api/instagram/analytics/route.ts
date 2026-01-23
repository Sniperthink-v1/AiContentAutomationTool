import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import {
  getInstagramAccessToken,
  getInstagramAudienceDemographics,
  getInstagramInsights,
  getInstagramMedia,
  getInstagramProfile,
} from '@/lib/instagram';

const CONTENT_COLORS: Record<string, string> = {
  REELS: '#3b82f6',
  IMAGE: '#60a5fa',
  CAROUSEL_ALBUM: '#93c5fd',
  VIDEO: '#2563eb',
};

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function getMonthLabel(date: Date, includeYear: boolean) {
  return date.toLocaleString('en-US', {
    month: 'short',
    year: includeYear ? '2-digit' : undefined,
  });
}

function normalizeRange(range: string | null) {
  return range || 'last_month';
}

function resolveRange(searchParams: URLSearchParams) {
  const range = normalizeRange(searchParams.get('range'));
  const end = new Date();
  let start = new Date(end);

  if (range === 'last_week') {
    start.setDate(end.getDate() - 6);
  } else if (range === 'last_3_months') {
    start.setMonth(end.getMonth() - 3);
  } else if (range === 'last_6_months') {
    start.setMonth(end.getMonth() - 6);
  } else if (range === 'last_year') {
    start.setFullYear(end.getFullYear() - 1);
  } else if (range === 'custom') {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) {
      const parsedFrom = new Date(from);
      const parsedTo = new Date(to);
      if (!Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
        start = parsedFrom;
        start.setHours(0, 0, 0, 0);
        const normalizedTo = new Date(parsedTo);
        normalizedTo.setHours(23, 59, 59, 999);
        return { range, start, end: normalizedTo };
      }
    }
  } else {
    start.setDate(end.getDate() - 29);
  }

  start.setHours(0, 0, 0, 0);
  return { range, start, end };
}

function rangeDays(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

function filterMediaByRange(media: any[], start: Date, end: Date) {
  return media.filter((item) => {
    if (!item.timestamp) return false;
    const date = new Date(item.timestamp);
    return date >= start && date <= end;
  });
}

function buildEngagementSeries(media: any[], start: Date, end: Date) {
  const totalDays = rangeDays(start, end);
  if (totalDays <= 31) {
    const buckets = new Map<string, { period: string; posts: number; engagement: number }>();
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const key = getDayKey(date);
      buckets.set(key, { period: getDayLabel(date), posts: 0, engagement: 0 });
    }

    media.forEach((item) => {
      if (!item.timestamp) return;
      const date = new Date(item.timestamp);
      const key = getDayKey(date);
      const bucket = buckets.get(key);
      if (!bucket) return;
      const likes = Number(item.like_count) || 0;
      const comments = Number(item.comments_count) || 0;
      bucket.posts += 1;
      bucket.engagement += likes + comments;
    });

    return Array.from(buckets.values());
  }

  const buckets = new Map<string, { period: string; posts: number; engagement: number }>();
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(end.getFullYear(), end.getMonth(), 1);
  const monthsCount =
    (monthEnd.getFullYear() - monthStart.getFullYear()) * 12 +
    (monthEnd.getMonth() - monthStart.getMonth()) +
    1;
  const includeYear = monthsCount > 12;

  for (let date = new Date(monthStart); date <= monthEnd; date.setMonth(date.getMonth() + 1)) {
    const key = getMonthKey(date);
    buckets.set(key, { period: getMonthLabel(date, includeYear), posts: 0, engagement: 0 });
  }

  media.forEach((item) => {
    if (!item.timestamp) return;
    const date = new Date(item.timestamp);
    const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const bucket = buckets.get(key);
    if (!bucket) return;
    const likes = Number(item.like_count) || 0;
    const comments = Number(item.comments_count) || 0;
    bucket.posts += 1;
    bucket.engagement += likes + comments;
  });

  return Array.from(buckets.values());
}

function buildContentDistribution(media: any[]) {
  const total = media.length || 1;
  const counts: Record<string, number> = {};

  media.forEach((item) => {
    const type = item.media_type || 'IMAGE';
    counts[type] = (counts[type] || 0) + 1;
  });

  return Object.entries(counts).map(([type, count]) => ({
    name:
      type === 'CAROUSEL_ALBUM'
        ? 'Carousels'
        : type === 'REELS'
        ? 'Reels'
        : type === 'VIDEO'
        ? 'Videos'
        : 'Photos',
    value: Math.round((count / total) * 100),
    color: CONTENT_COLORS[type] || '#93c5fd',
  }));
}

function buildTopPosts(media: any[]) {
  return media
    .map((item: any) => {
      const likes = Number(item.like_count) || 0;
      const comments = Number(item.comments_count) || 0;
      return {
        id: item.id,
        caption: item.caption || 'Untitled post',
        likes,
        comments,
        shares: 0,
        engagement: likes + comments,
        thumbnailUrl: item.thumbnail_url || item.media_url || '',
      };
    })
    .sort((a: any, b: any) => b.engagement - a.engagement)
    .slice(0, 5);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenData = await getInstagramAccessToken(user.id);
    if (!tokenData) {
      return NextResponse.json({ connected: false });
    }

    const { accessToken, igUserId } = tokenData;
    const { range, start, end } = resolveRange(request.nextUrl.searchParams);
    const totalDays = rangeDays(start, end);
    const insightsPeriod =
      totalDays <= 7 ? 'day' : totalDays <= 30 ? 'days_28' : 'week';

    const [profileResult, insightsResult, mediaResult, audienceResult] =
      await Promise.allSettled([
        getInstagramProfile(igUserId, accessToken),
        getInstagramInsights(igUserId, accessToken, insightsPeriod),
        getInstagramMedia(igUserId, accessToken, 50),
        getInstagramAudienceDemographics(igUserId, accessToken),
      ]);

    const profile =
      profileResult.status === 'fulfilled' ? profileResult.value : null;
    const insights =
      insightsResult.status === 'fulfilled' ? insightsResult.value : {};
    const media = mediaResult.status === 'fulfilled' ? mediaResult.value : [];
    const audience =
      audienceResult.status === 'fulfilled' ? audienceResult.value : [];
    const rangeMedia = filterMediaByRange(media, start, end);

    const followers = profile?.followers_count || 0;
    const totalEngagement = rangeMedia.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.like_count) || 0) + (Number(item.comments_count) || 0),
      0
    );
    const engagementRate = followers
      ? Number(((totalEngagement / followers) * 100).toFixed(2))
      : 0;

    return NextResponse.json({
      connected: true,
      profile: {
        username: profile?.username || '',
        followers,
        mediaCount: profile?.media_count || 0,
        profilePictureUrl: profile?.profile_picture_url || '',
      },
      overview: {
        followers,
        engagementRate,
        reach: insights.reach || 0,
        impressions: insights.impressions || 0,
      },
      growth: buildEngagementSeries(rangeMedia, start, end),
      contentDistribution: buildContentDistribution(rangeMedia),
      topPosts: buildTopPosts(rangeMedia),
      audience,
      range,
    });
  } catch (error: any) {
    console.error('Instagram analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
