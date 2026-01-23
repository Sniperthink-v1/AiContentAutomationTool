import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import {
  getInstagramAccessToken,
  getInstagramInsights,
  getInstagramMedia,
  getInstagramProfile,
} from '@/lib/instagram';

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
    const buckets = new Map<string, { date: string; likes: number; comments: number; shares: number }>();
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const key = getDayKey(date);
      buckets.set(key, { date: getDayLabel(date), likes: 0, comments: 0, shares: 0 });
    }

    media.forEach((item) => {
      if (!item.timestamp) return;
      const key = getDayKey(new Date(item.timestamp));
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.likes += Number(item.like_count) || 0;
      bucket.comments += Number(item.comments_count) || 0;
    });

    return Array.from(buckets.values());
  }

  const buckets = new Map<string, { date: string; likes: number; comments: number; shares: number }>();
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(end.getFullYear(), end.getMonth(), 1);
  const monthsCount =
    (monthEnd.getFullYear() - monthStart.getFullYear()) * 12 +
    (monthEnd.getMonth() - monthStart.getMonth()) +
    1;
  const includeYear = monthsCount > 12;

  for (let date = new Date(monthStart); date <= monthEnd; date.setMonth(date.getMonth() + 1)) {
    const key = getMonthKey(date);
    buckets.set(key, { date: getMonthLabel(date, includeYear), likes: 0, comments: 0, shares: 0 });
  }

  media.forEach((item) => {
    if (!item.timestamp) return;
    const date = new Date(item.timestamp);
    const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.likes += Number(item.like_count) || 0;
    bucket.comments += Number(item.comments_count) || 0;
  });

  return Array.from(buckets.values());
}

function buildFollowerSeries(followers: number, engagementSeries: Array<{ date: string }>) {
  return engagementSeries.map((entry) => ({
    date: entry.date,
    followers,
  }));
}

function countPostsInRange(media: any[], start: Date, end: Date) {
  return media.filter((item) => {
    if (!item.timestamp) return false;
    const date = new Date(item.timestamp);
    return date >= start && date <= end;
  }).length;
}

function buildTopPosts(media: any[], followers: number) {
  return media
    .map((item: any) => {
      const likes = Number(item.like_count) || 0;
      const comments = Number(item.comments_count) || 0;
      const engagement = followers
        ? Number((((likes + comments) / followers) * 100).toFixed(2))
        : 0;
      return {
        id: item.id,
        caption: item.caption || 'Untitled post',
        likes,
        comments,
        engagement,
        thumbnailUrl: item.thumbnail_url || item.media_url || '',
      };
    })
    .sort((a: any, b: any) => b.engagement - a.engagement)
    .slice(0, 4);
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

    const [profileResult, insightsResult, mediaResult] = await Promise.allSettled([
      getInstagramProfile(igUserId, accessToken),
      getInstagramInsights(igUserId, accessToken, insightsPeriod),
      getInstagramMedia(igUserId, accessToken, 50),
    ]);

    const profile =
      profileResult.status === 'fulfilled' ? profileResult.value : null;
    const insights =
      insightsResult.status === 'fulfilled' ? insightsResult.value : {};
    const media = mediaResult.status === 'fulfilled' ? mediaResult.value : [];
    const rangeMedia = filterMediaByRange(media, start, end);

    const followers = profile?.followers_count || 0;
    const engagementSeries = buildEngagementSeries(rangeMedia, start, end);
    const totalEngagement = engagementSeries.reduce(
      (sum, day) => sum + day.likes + day.comments,
      0
    );
    const engagementRate = followers
      ? Number(((totalEngagement / followers) * 100).toFixed(2))
      : 0;

    const recentPosts = buildTopPosts(rangeMedia, followers);

    return NextResponse.json({
      connected: true,
      stats: {
        followers,
        engagementRate,
        reach: insights.reach || 0,
        postsThisWeek: countPostsInRange(rangeMedia, start, end),
      },
      followerData: buildFollowerSeries(followers, engagementSeries),
      engagementData: engagementSeries,
      recentPosts,
      range,
    });
  } catch (error: any) {
    console.error('Instagram dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
