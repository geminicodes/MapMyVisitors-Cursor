import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getLocationFromIP } from '@/lib/geoip';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= 10) {
    return false;
  }

  entry.count++;
  return true;
}

function validateWidgetId(widgetId: string): boolean {
  return /^[a-zA-Z0-9_-]{12}$/.test(widgetId);
}

function validateUrl(url: string): boolean {
  if (!url || url.length > 2048) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function checkMonthlyLimit(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<{ allowed: boolean; currentCount: number }> {
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await supabase
    .from('monthly_pageviews')
    .select('pageview_count')
    .eq('user_id', userId)
    .eq('month', month.toISOString().split('T')[0])
    .maybeSingle();

  if (error) {
    console.error('[Track] Error checking monthly limit:', error);
    throw error;
  }

  const currentCount = data?.pageview_count || 0;
  return { allowed: currentCount < 10000, currentCount };
}

async function incrementMonthlyPageviews(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<void> {
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = month.toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('monthly_pageviews')
    .select('pageview_count')
    .eq('user_id', userId)
    .eq('month', monthStr)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('monthly_pageviews')
      .update({ pageview_count: existing.pageview_count + 1 })
      .eq('user_id', userId)
      .eq('month', monthStr);

    if (error) {
      console.error('[Track] Error incrementing pageviews:', error);
    }
  } else {
    const { error } = await supabase
      .from('monthly_pageviews')
      .insert({
        user_id: userId,
        month: monthStr,
        pageview_count: 1,
      });

    if (error && error.code !== '23505') {
      console.error('[Track] Error creating pageview record:', error);
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers }
      );
    }

    const body = await request.json();
    const { widgetId, pageUrl, referrer } = body;

    if (!widgetId || !validateWidgetId(widgetId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid widget ID' },
        { status: 400, headers }
      );
    }

    if (!pageUrl || !validateUrl(pageUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid page URL' },
        { status: 400, headers }
      );
    }

    const supabase = createServiceClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, paid')
      .eq('widget_id', widgetId)
      .maybeSingle();

    if (userError) {
      console.error('[Track] Database error:', userError);
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

    const { allowed, currentCount } = await checkMonthlyLimit(supabase, user.id);

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Monthly limit reached (10,000 pageviews)' },
        { status: 429, headers }
      );
    }

    const location = await getLocationFromIP(ip);
    const userAgent = request.headers.get('user-agent') || null;

    const { error: insertError } = await supabase
      .from('visitors')
      .insert({
        user_id: user.id,
        country: location.country,
        country_code: location.countryCode,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        page_url: pageUrl,
        user_agent: userAgent,
        referrer: referrer || null,
      });

    if (insertError) {
      console.error('[Track] Error inserting visitor:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to track visitor' },
        { status: 500, headers }
      );
    }

    await incrementMonthlyPageviews(supabase, user.id);

    return NextResponse.json(
      { success: true, message: 'Tracked' },
      { headers }
    );
  } catch (error) {
    console.error('[Track] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}
