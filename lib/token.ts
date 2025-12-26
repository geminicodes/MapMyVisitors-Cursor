import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || '';

if (!SECRET || SECRET.length < 32) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('JWT_SECRET not set or too short. Using development fallback.');
  }
}

interface TokenPayload {
  userId: string;
  widgetId: string;
}

export function generateMagicToken(userId: string, widgetId: string): string {
  const payload = {
    userId,
    widgetId,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
  };

  return jwt.sign(payload, SECRET);
}

export function verifyMagicToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as any;
    return {
      userId: decoded.userId,
      widgetId: decoded.widgetId,
    };
  } catch (error: any) {
    console.error('[Token] Verification failed:', error.message);
    return null;
  }
}
