import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

function checkRateLimit(widgetId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(widgetId);

  if (!entry) {
    rateLimits.set(widgetId, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (now > entry.resetAt) {
    rateLimits.set(widgetId, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 100) {
    return false;
  }

  entry.count++;
  return true;
}

function validateWidgetId(widgetId: string): boolean {
  return /^[a-zA-Z0-9_-]{12}$/.test(widgetId);
}

interface VisitorData {
  id: string;
  lat: number;
  lng: number;
  city: string | null;
  country: string;
  timestamp: string;
  isRecent: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { widgetId: string } }
) {
  const headers = {
    'Cache-Control': 'public, max-age=10',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { widgetId } = params;

    if (!validateWidgetId(widgetId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid widget ID format' },
        { status: 400, headers }
      );
    }

    if (!checkRateLimit(widgetId)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '50', 10), 100);

    const supabase = createServiceClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, paid')
      .eq('widget_id', widgetId)
      .maybeSingle();

    if (userError) {
      console.error('[Visitors] Database error:', userError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Widget ID not found' },
        { status: 404, headers }
      );
    }

    if (!user.paid) {
      return NextResponse.json(
        { success: false, error: 'Payment required' },
        { status: 402, headers }
      );
    }

    const { data: visitors, error: visitorsError } = await supabase
      .from('visitors')
      .select('id, latitude, longitude, city, country, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (visitorsError) {
      console.error('[Visitors] Error fetching visitors:', visitorsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch visitors' },
        { status: 500, headers }
      );
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const formattedVisitors: VisitorData[] = (visitors || []).map((v) => {
      const createdAt = new Date(v.created_at);
      return {
        id: v.id,
        lat: parseFloat(v.latitude.toString()),
        lng: parseFloat(v.longitude.toString()),
        city: v.city,
        country: v.country,
        timestamp: v.created_at,
        isRecent: createdAt > fiveMinutesAgo,
      };
    });

    const totalToday = (visitors || []).filter(
      (v) => new Date(v.created_at) >= todayStart
    ).length;

    const activeNow = (visitors || []).filter(
      (v) => new Date(v.created_at) > fiveMinutesAgo
    ).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          visitors: formattedVisitors,
          totalToday,
          activeNow,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('[Visitors] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(_request: NextRequest) {
   return new NextResponse(null, {
     status: 200,
     headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
