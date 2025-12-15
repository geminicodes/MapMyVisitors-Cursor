import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateMagicToken } from '@/lib/token';
import { sendMagicLinkEmail } from '@/lib/email';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= 3) {
    return false;
  }

  entry.count++;
  return true;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again in an hour.' },
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

    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('id, email, widget_id, paid')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (dbError) {
      console.error('[Recovery] Database error:', dbError);
    }

    console.log('[Recovery] Request received', {
      email: normalizedEmail,
      userFound: !!user,
      timestamp: new Date().toISOString(),
    });

    if (user && user.paid) {
      const token = generateMagicToken(user.id, user.widget_id);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const magicLink = `${appUrl}/dashboard?token=${token}`;

      const { success } = await sendMagicLinkEmail(normalizedEmail, magicLink);

      if (success) {
        console.log('[Recovery] Email sent successfully', {
          email: normalizedEmail,
          userId: user.id,
        });
      } else {
        console.error('[Recovery] Email send failed', { email: normalizedEmail });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a magic link shortly.',
    });
  } catch (error) {
    console.error('[Recovery] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
