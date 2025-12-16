import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lemon Squeezy webhook handler (mission-critical payment code).
 *
 * SECURITY REQUIREMENTS
 * - Verify signature FIRST using raw body bytes (request.text()).
 * - Constant-time compare (timingSafeEqual), never ===.
 * - Never log secrets/signatures.
 *
 * OPERATIONAL REQUIREMENTS
 * - Return 401 only for missing/invalid signature.
 * - Return 200 for all other cases (prevents retry loops).
 * - Use Supabase service role client (bypasses RLS).
 */

interface LemonSqueezyWebhook {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      widget_id?: string;
    };
  };
  data?: {
    id?: string; // order_id
    attributes?: {
      user_email?: string;
      status?: 'paid' | 'pending' | 'failed' | string;
      total?: number;
      currency?: string;
    };
  };
}

type JsonRecord = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function parsePossiblyPrefixedHexSignature(signatureHeader: string): string {
  // Some providers use formats like: "sha256=<hex>". Lemon Squeezy typically sends raw hex.
  const trimmed = signatureHeader.trim();
  const parts = trimmed.split('=');
  return (parts.length > 1 ? parts[parts.length - 1] : trimmed).trim();
}

function safeTimingEqualHex(aHex: string, bHex: string): boolean {
  // timingSafeEqual throws if buffer lengths differ; fail closed.
  // Also fail closed if either side is not valid hex.
  try {
    const a = Buffer.from(aHex, 'hex');
    const b = Buffer.from(bHex, 'hex');

    // Buffer.from(invalidHex, 'hex') can produce shorter buffers; guard by re-encoding.
    if (a.length === 0 || b.length === 0) return false;
    if (a.toString('hex') !== aHex.toLowerCase()) return false;
    if (b.toString('hex') !== bHex.toLowerCase()) return false;
    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function computeLemonSqueezyHmac(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function getSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // Throw here; caller will catch and still return 200 to avoid retries.
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const timestamp = nowIso();

  // 1) Raw body MUST be read before any JSON parsing.
  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch (error) {
    console.error('[Webhook] ❌ Failed to read raw body', {
      timestamp,
      action: 'MANUAL_FIX',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('OK', { status: 200 });
  }

  // 2) Extract signature header.
  const signatureHeader = request.headers.get('x-signature');
  if (!signatureHeader) {
    console.error('[Webhook] 🚨 Missing signature header', { timestamp, hasSignature: false });
    return new Response('Unauthorized', { status: 401 });
  }

  // 3) Verify signature using constant-time comparison.
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: we cannot verify authenticity.
    console.error('[Webhook] 🚨 Webhook secret not configured', {
      timestamp,
      hasSignature: true,
      action: 'MANUAL_FIX',
    });
    return new Response('Unauthorized', { status: 401 });
  }

  const providedSignature = parsePossiblyPrefixedHexSignature(signatureHeader);
  const computedSignature = computeLemonSqueezyHmac(rawBody, secret);

  const isValidSignature = safeTimingEqualHex(providedSignature, computedSignature);
  if (!isValidSignature) {
    console.error('[Webhook] 🚨 Invalid signature', { timestamp, hasSignature: true });
    return new Response('Unauthorized', { status: 401 });
  }

  // 4) Parse JSON only after signature verification.
  let payload: LemonSqueezyWebhook;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    payload = isRecord(parsed) ? (parsed as LemonSqueezyWebhook) : {};
  } catch (error) {
    console.error('[Webhook] ❌ Invalid JSON payload', {
      timestamp,
      action: 'MANUAL_FIX',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('OK', { status: 200 });
  }

  // 5) Ignore non-order_created events.
  const eventName = asNonEmptyString(payload.meta?.event_name);
  if (eventName !== 'order_created') {
    console.log('[Webhook] ℹ️ Ignored event', { timestamp, eventName: eventName ?? 'unknown' });
    return new Response('OK', { status: 200 });
  }

  // 6) Extract required fields.
  const userId = asNonEmptyString(payload.meta?.custom_data?.user_id);
  const widgetId = asNonEmptyString(payload.meta?.custom_data?.widget_id);
  const orderId = asNonEmptyString(payload.data?.id);

  const status = asNonEmptyString(payload.data?.attributes?.status);
  const email = asNonEmptyString(payload.data?.attributes?.user_email);
  const amount = typeof payload.data?.attributes?.total === 'number' ? payload.data.attributes.total : null;
  const currency = asNonEmptyString(payload.data?.attributes?.currency);

  // 7) Validate required fields (but still return 200 to avoid retries).
  if (!userId || !widgetId || !orderId || !status) {
    console.error('[Webhook] ❌ Missing required fields', {
      timestamp,
      action: 'MANUAL_FIX',
      hasUserId: !!userId,
      hasWidgetId: !!widgetId,
      hasOrderId: !!orderId,
      hasStatus: !!status,
    });
    return new Response('OK', { status: 200 });
  }

  // 8) Ignore statuses other than paid.
  if (status !== 'paid') {
    console.log('[Webhook] ℹ️ Ignored non-paid order', {
      timestamp,
      userId,
      widgetId,
      orderId,
      status,
    });
    return new Response('OK', { status: 200 });
  }

  // 9) Create Supabase service client.
  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseServiceClient();
  } catch (error) {
    console.error('[Webhook] ❌ Supabase service client misconfigured', {
      timestamp,
      action: 'MANUAL_FIX',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('OK', { status: 200 });
  }

  // 10) Idempotency / sanity checks: fetch current user state.
  try {
    const { data: userRow, error: selectError } = await supabase
      .from('users')
      .select('id, paid, lemonsqueezy_order_id, email, widget_id')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('[Webhook] ❌ DB read failed', {
        timestamp,
        userId,
        orderId,
        action: 'MANUAL_FIX',
        error: selectError.message,
      });
      return new Response('OK', { status: 200 });
    }

    if (!userRow) {
      console.warn('[Webhook] ⚠️ User not found', {
        timestamp,
        userId,
        orderId,
        email,
        widgetId,
      });
      return new Response('OK', { status: 200 });
    }

    const alreadyPaid = userRow.paid === true;
    const existingOrderId = asNonEmptyString(userRow.lemonsqueezy_order_id);

    if (alreadyPaid) {
      // Idempotent: do not fail, but warn if a different order is being attached.
      if (existingOrderId && existingOrderId !== orderId) {
        console.warn('[Webhook] ⚠️ User already paid with different order id', {
          timestamp,
          userId,
          orderId,
          existingOrderId,
          action: 'MANUAL_REVIEW',
        });
      } else {
        console.log('[Webhook] ℹ️ Already paid (idempotent)', {
          timestamp,
          userId,
          orderId,
        });
      }

      // Still ensure order id is stored (best-effort).
    }

    // Optional consistency checks (non-blocking): widget/email mismatches.
    const dbWidgetId = asNonEmptyString(userRow.widget_id);
    if (dbWidgetId && dbWidgetId !== widgetId) {
      console.warn('[Webhook] ⚠️ Widget mismatch', {
        timestamp,
        userId,
        orderId,
        widgetId,
        dbWidgetId,
        action: 'MANUAL_REVIEW',
      });
    }

    const dbEmail = asNonEmptyString(userRow.email);
    if (email && dbEmail && email.toLowerCase() !== dbEmail.toLowerCase()) {
      console.warn('[Webhook] ⚠️ Email mismatch', {
        timestamp,
        userId,
        orderId,
        email,
        dbEmail,
        action: 'MANUAL_REVIEW',
      });
    }
  } catch (error) {
    console.error('[Webhook] ❌ DB pre-check failed', {
      timestamp,
      userId,
      orderId,
      action: 'MANUAL_FIX',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('OK', { status: 200 });
  }

  // 11) Update user as paid (best-effort, never throw).
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        paid: true,
        lemonsqueezy_order_id: orderId,
      })
      .eq('id', userId)
      .select('id');

    if (error) {
      console.error('[Webhook] ❌ DB update failed', {
        timestamp,
        userId,
        orderId,
        error: error.message,
        action: 'MANUAL_FIX',
      });
      return new Response('OK', { status: 200 });
    }

    const updatedCount = Array.isArray(data) ? data.length : 0;
    if (updatedCount === 0) {
      console.warn('[Webhook] ⚠️ No rows updated (user not found?)', {
        timestamp,
        userId,
        orderId,
        action: 'MANUAL_REVIEW',
      });
      return new Response('OK', { status: 200 });
    }

    console.log('[Webhook] ✅ Payment confirmed', {
      timestamp,
      userId,
      orderId,
      email,
      amount,
      currency,
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] ❌ Unhandled exception during DB update', {
      timestamp,
      userId,
      orderId,
      action: 'MANUAL_FIX',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('OK', { status: 200 });
  }
}

// Required for Node.js crypto module.
export const runtime = 'nodejs';

// Required by some setups to avoid body parsing; route handlers already provide raw access via request.text().
// Kept intentionally to match security requirements.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
