import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createServiceClient } from '@/lib/supabase';
import { createInMemoryRateLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const signupLimiter = createInMemoryRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  maxEntries: 50_000,
});

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function generateUniqueWidgetId(supabase: ReturnType<typeof createServiceClient>): Promise<string> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const widgetId = nanoid(12);

    const { data, error } = await supabase
      .from('users')
      .select('widget_id')
      .eq('widget_id', widgetId)
      .maybeSingle();

    if (error) {
      console.error('[Signup] Error checking widget ID uniqueness:', error);
      throw error;
    }

    if (!data) {
      return widgetId;
    }
  }

  throw new Error('Failed to generate unique widget ID');
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (!signupLimiter.allow(ip.trim())) {
      return NextResponse.json(
        { success: false, error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    const widgetId = await generateUniqueWidgetId(supabase);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        widget_id: widgetId,
        paid: false,
      })
      .select('id, email, widget_id')
      .single();

    if (insertError) {
      logger.error('[Signup] Failed to create user', { message: insertError.message });
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL;
    if (!baseUrl) {
      logger.error('[Signup] Missing NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL');
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    const checkoutUrl = new URL(baseUrl);
    checkoutUrl.searchParams.set('checkout[email]', normalizedEmail);
    checkoutUrl.searchParams.set('checkout[custom][user_id]', newUser.id);
    checkoutUrl.searchParams.set('checkout[custom][widget_id]', widgetId);

    logger.info('[Signup] User created', {
      userId: newUser.id,
      widgetId,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: newUser.id,
        widgetId,
        checkoutUrl: checkoutUrl.toString(),
      },
    });
  } catch (error) {
    logger.error('[Signup] Error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
