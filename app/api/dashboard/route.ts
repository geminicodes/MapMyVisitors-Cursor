import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

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

  if (entry.count >= 60) {
    return false;
  }

  entry.count++;
  return true;
}

function validateWidgetId(widgetId: string): boolean {
  return /^[a-zA-Z0-9_-]{12}$/.test(widgetId);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const widgetId = searchParams.get('widgetId');

    if (!widgetId) {
      return NextResponse.json(
        { success: false, error: 'Widget ID is required' },
        { status: 400 }
      );
    }

    if (!validateWidgetId(widgetId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid widget ID format' },
        { status: 400 }
      );
    }

    if (!checkRateLimit(widgetId)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      );
    }

    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('email, widget_id, paid, watermark_removed')
      .eq('widget_id', widgetId)
      .maybeSingle();

    if (error) {
      console.error('[Dashboard] Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.paid) {
      console.log('[Dashboard] Access attempt for unpaid user:', { widgetId });
      return NextResponse.json(
        { success: false, error: 'Payment required' },
        { status: 402 }
      );
    }

    console.log('[Dashboard] Verification successful:', { widgetId, email: user.email });

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        widgetId: user.widget_id,
        paid: user.paid,
        watermarkRemoved: user.watermark_removed,
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
