import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/token';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 400 }
      );
    }

    const decoded = verifyMagicToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, widget_id, paid')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (error) {
      console.error('[Verify Token] Database error:', error);
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
      return NextResponse.json(
        { success: false, error: 'Payment required' },
        { status: 402 }
      );
    }

    console.log('[Verify Token] Token verified successfully', {
      userId: user.id,
      widgetId: user.widget_id,
    });

    return NextResponse.json({
      success: true,
      widgetId: user.widget_id,
      email: user.email,
    });
  } catch (error) {
    console.error('[Verify Token] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
