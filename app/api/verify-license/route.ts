import { NextRequest, NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { nanoid } from 'nanoid';

const GUMROAD_API_TOKEN = process.env.GUMROAD_API_TOKEN;
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID;

interface GumroadResponse {
  success: boolean;
  purchase?: {
    email: string;
    sale_timestamp: string;
  };
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, licenseKey } = await request.json();

    if (!email || !licenseKey) {
      return NextResponse.json(
        { message: 'Email and license key are required' },
        { status: 400 }
      );
    }

    if (!GUMROAD_API_TOKEN || !GUMROAD_PRODUCT_ID) {
      return NextResponse.json(
        { message: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedLicenseKey = String(licenseKey).trim();
    
    const formData = new URLSearchParams();
    formData.append('product_id', GUMROAD_PRODUCT_ID);
    formData.append('license_key', normalizedLicenseKey);
    formData.append('increment_uses_count', 'false');

    const gumroadResponse = await fetch(
      'https://api.gumroad.com/v2/licenses/verify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const data: GumroadResponse = await gumroadResponse.json();

    if (!data.success) {
      return NextResponse.json(
        { message: 'Invalid license key' },
        { status: 401 }
      );
    }

    const purchaseEmail = data.purchase?.email ? data.purchase.email.trim().toLowerCase() : '';
    if (!purchaseEmail || purchaseEmail !== normalizedEmail) {
      return NextResponse.json(
        { message: 'Email does not match license' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const generateUniqueWidgetId = async (): Promise<string> => {
      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = nanoid(12);
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('widget_id', candidate)
          .maybeSingle();
        if (!existing) return candidate;
      }
      throw new Error('Failed to generate unique widget id');
    };
    
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('license_key', normalizedLicenseKey)
      .maybeSingle();

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { message: 'Database error. Please try again.' },
        { status: 500 }
      );
    }

    let customer;

    if (existingCustomer) {
      if (String(existingCustomer.email).trim().toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { message: 'This license key is already registered to another email' },
          { status: 401 }
        );
      }

      customer = existingCustomer;
    } else {
      // Ensure there is a `users` row for tracking & visitor endpoints.
      const { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('id, widget_id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userFetchError) {
        console.error('Database error (users lookup):', userFetchError);
        return NextResponse.json(
          { message: 'Database error. Please try again.' },
          { status: 500 }
        );
      }

      let userId: string;
      let widgetId: string;

      if (existingUser) {
        userId = existingUser.id;
        widgetId = existingUser.widget_id;

        // Mark paid to enable tracking routes.
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ paid: true })
          .eq('id', userId);

        if (userUpdateError) {
          console.error('Database error (users update):', userUpdateError);
          return NextResponse.json(
            { message: 'Database error. Please try again.' },
            { status: 500 }
          );
        }
      } else {
        widgetId = await generateUniqueWidgetId();

        const { data: newUser, error: userInsertError } = await supabase
          .from('users')
          .insert({
            email: normalizedEmail,
            widget_id: widgetId,
            paid: true,
          })
          .select('id')
          .single();

        if (userInsertError) {
          console.error('Database insert error (users):', userInsertError);
          return NextResponse.json(
            { message: 'Database error. Please try again.' },
            { status: 500 }
          );
        }

        userId = newUser.id;
      }

      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          email: normalizedEmail,
          license_key: normalizedLicenseKey,
          widget_id: widgetId,
          user_id: userId,
          plan: 'basic',
          purchased_at: data.purchase?.sale_timestamp || new Date().toISOString(),
          pageviews_used: 0,
          pageviews_limit: 10000,
          website_domains: [],
          status: 'active',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        return NextResponse.json(
          { message: 'Failed to create customer record. Please try again.' },
          { status: 500 }
        );
      }

      customer = newCustomer;
    }

    const token = createToken({
      id: customer.id,
      email: customer.email,
      licenseKey: customer.license_key,
      plan: customer.plan,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: 'License verified successfully',
      customer: {
        id: customer.id,
        email: customer.email,
        plan: customer.plan,
      },
    });
  } catch (error) {
    console.error('License verification error:', error);
    return NextResponse.json(
      { message: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
