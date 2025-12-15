'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Copy, Check, Loader2, AlertCircle, Globe } from 'lucide-react';

interface UserData {
  email: string;
  widgetId: string;
  paid: boolean;
  watermarkRemoved: boolean;
}

export default function DashboardPage() {
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const verifyUser = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboard?widgetId=${id}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError('payment-pending');
        } else if (response.status === 404) {
          setError('not-found');
        } else {
          setError('generic');
        }
        setLoading(false);
        return;
      }

      setUserData(data.user);
      setLoading(false);
    } catch (err) {
      setError('network');
      setLoading(false);
    }
  };

  useEffect(() => {
    async function initialize() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (token) {
        try {
          const response = await fetch(`/api/verify-token?token=${token}`);
          const data = await response.json();

          if (data.success) {
            localStorage.setItem('mmv_widget_id', data.widgetId);
            setWidgetId(data.widgetId);

            window.history.replaceState({}, '', '/dashboard');

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);

            verifyUser(data.widgetId);
          } else {
            setError('invalid-token');
            setLoading(false);
          }
        } catch (err) {
          setError('network');
          setLoading(false);
        }
      } else {
        const id = localStorage.getItem('mmv_widget_id');
        if (!id) {
          setError('no-widget-id');
          setLoading(false);
          return;
        }
        setWidgetId(id);
        verifyUser(id);
      }

      if (params.get('success') === 'true') {
        setShowSuccess(true);
        window.history.replaceState({}, '', '/dashboard');
        setTimeout(() => setShowSuccess(false), 5000);
      }
    }

    initialize();
  }, []);

  const handleCopy = async () => {
    if (!widgetId) return;

    const widgetCode = `<!-- Step 1: Add container (optional) -->
<div id="mapmyvisitors-widget"></div>

<!-- Step 2: Add widget script -->
<script src="https://mapmyvisitors.com/widget.js?id=${widgetId}"></script>`;

    try {
      await navigator.clipboard.writeText(widgetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy. Please copy the code manually.');
    }
  };

  const handleRetry = () => {
    if (widgetId) {
      setLoading(true);
      setError(null);
      verifyUser(widgetId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent-blue mx-auto mb-4 animate-spin" aria-label="Loading" />
          <p className="text-text-secondary text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorConfig = {
      'no-widget-id': {
        icon: <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />,
        heading: 'Widget ID Not Found',
        message: "It looks like you haven't signed up yet or lost your widget code.",
        subtext: "Sign up on the homepage or recover your existing account if you already paid.",
        buttonText: 'Recover Account',
        buttonAction: () => {},
        isLink: true,
        linkTo: '/recover',
      },
      'payment-pending': {
        icon: <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />,
        heading: 'Payment Pending',
        message: "We're processing your payment. This usually takes 1-2 minutes. Please refresh this page in a moment.",
        subtext: "If it takes longer than 5 minutes, check your email for confirmation or contact support.",
        buttonText: 'Refresh Page',
        buttonAction: () => window.location.reload(),
        isLink: false,
        linkTo: undefined,
      },
      'not-found': {
        icon: <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />,
        heading: 'Account Not Found',
        message: "This widget ID doesn't exist in our system. Please sign up again.",
        subtext: undefined,
        buttonText: 'Sign Up Again',
        buttonAction: () => {},
        isLink: true,
        linkTo: '/',
      },
      'network': {
        icon: <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />,
        heading: 'Connection Error',
        message: 'Unable to load your dashboard. Please check your internet connection.',
        subtext: undefined,
        buttonText: 'Retry',
        buttonAction: handleRetry,
        isLink: false,
        linkTo: undefined,
      },
      'generic': {
        icon: <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />,
        heading: 'Something Went Wrong',
        message: 'Failed to load dashboard. Please try again.',
        subtext: undefined,
        buttonText: 'Retry',
        buttonAction: handleRetry,
        isLink: false,
        linkTo: undefined,
      },
      'invalid-token': {
        icon: <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />,
        heading: 'Invalid or Expired Link',
        message: 'This magic link has expired or is invalid. Please request a new one.',
        subtext: undefined,
        buttonText: 'Request New Link',
        buttonAction: () => {},
        isLink: true,
        linkTo: '/recover',
      },
    };

    const config = errorConfig[error as keyof typeof errorConfig] || errorConfig.generic;

    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-space-card border border-space-border rounded-2xl p-8 text-center">
          {config.icon}
          <h1 className="text-3xl font-bold mb-4">{config.heading}</h1>
          <p className="text-text-secondary mb-2">{config.message}</p>
          {config.subtext && (
            <p className="text-text-muted text-sm mb-6">{config.subtext}</p>
          )}
          {config.isLink ? (
            <Link
              href={config.linkTo || '/'}
              className="inline-block px-6 py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold rounded-lg hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-accent-blue/50"
            >
              {config.buttonText}
            </Link>
          ) : (
            <button
              onClick={config.buttonAction}
              className="px-6 py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold rounded-lg hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-accent-blue/50"
            >
              {config.buttonText}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-space-dark">
      {showSuccess && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-accent-green p-4 text-center text-white font-medium animate-slide-down">
          ✓ Payment successful! Your widget is ready.
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="flex items-center justify-center mb-8">
          <Globe className="w-10 h-10 text-accent-blue mr-3" aria-hidden="true" />
          <Link href="/" className="text-2xl font-bold hover:text-accent-blue transition-colors">
            MapMyVisitors
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Your Globe is Ready! 🎉</h1>
          <p className="text-lg font-medium text-text-secondary mb-2">
            Copy the code below and paste it on your website
          </p>
          <p className="text-sm text-text-muted">
            Logged in as: {userData.email}
          </p>
        </div>

        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 rounded-3xl blur-3xl" aria-hidden="true"></div>

          <div
            className="relative p-8 rounded-3xl backdrop-blur-xl bg-white/5 border border-transparent shadow-2xl"
            style={{
              borderImage: 'linear-gradient(to right, #3b82f6, #8b5cf6) 1',
              boxShadow: '0 0 60px rgba(59, 130, 246, 0.2)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4">Your Widget Code</h2>

            <div className="bg-space-dark p-6 rounded-xl mb-4 overflow-x-auto">
              <pre className="text-sm font-mono text-white whitespace-pre-wrap break-words">
{`<!-- Step 1: Add container (optional) -->
<div id="mapmyvisitors-widget"></div>

<!-- Step 2: Add widget script -->
<script src="https://mapmyvisitors.com/widget.js?id=${widgetId}"></script>`}
              </pre>
            </div>

            <button
              onClick={handleCopy}
              className="w-full sm:w-auto h-12 px-6 bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold rounded-xl hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-accent-blue/50 flex items-center justify-center gap-2 mb-4"
              aria-label="Copy widget code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" aria-hidden="true" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" aria-hidden="true" />
                  Copy Code
                </>
              )}
            </button>

            <p className="text-sm text-text-secondary">
              Paste this code anywhere in your HTML, just before the closing &lt;/body&gt; tag
            </p>
          </div>
        </div>

        <div className="text-center mt-12 space-y-2">
          <p className="text-sm text-text-muted">
            Need help?{' '}
            <a
              href="mailto:hello@mapmyvisitors.com"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              hello@mapmyvisitors.com
            </a>
          </p>
          <p className="text-sm text-text-muted">
            Want multiple websites?{' '}
            <a
              href="mailto:hello@mapmyvisitors.com"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
