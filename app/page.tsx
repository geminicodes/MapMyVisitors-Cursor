'use client';

import { useState, useEffect } from 'react';
import { Globe, Zap, Code, Check } from 'lucide-react';
import InteractiveGlobe from '@/components/DemoGlobe';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    pricingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      console.log('Email submitted:', email);
    }
  };

  return (
    <div className="min-h-screen bg-space-dark">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled ? 'bg-space-dark/80 backdrop-blur-xl border-b border-space-border' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-8 h-8 text-accent-blue" aria-label="MapMyVisitors logo" />
            <span className="text-xl font-bold">MapMyVisitors</span>
          </div>
          <button
            onClick={scrollToPricing}
            className="px-6 py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium rounded-lg hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-accent-blue/50"
          >
            Get Started - $29
          </button>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-space-card border border-space-border mb-8">
                <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" aria-hidden="true"></span>
                <span className="text-sm text-text-secondary">245 people watching now</span>
              </div>

              <h1 className="text-6xl md:text-6xl font-bold mb-6 max-w-4xl leading-tight">
                Show The World Where{' '}
                <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
                  Your Visitors Come From
                </span>
              </h1>

              <div className="flex flex-wrap items-center justify-center gap-4 mb-12 text-text-secondary">
                <span className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4" aria-hidden="true" />
                  3D Globe
                </span>
                <span className="text-text-muted">•</span>
                <span className="flex items-center gap-2 text-base">
                  <Code className="w-4 h-4" aria-hidden="true" />
                  One Line of Code
                </span>
                <span className="text-text-muted">•</span>
                <span className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4" aria-hidden="true" />
                  Real-Time Updates
                </span>
              </div>

              <div className="w-full max-w-[800px] mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 rounded-3xl blur-3xl" aria-hidden="true"></div>
                <div className="relative">
                  <InteractiveGlobe />
                </div>
              </div>

              <button
                onClick={scrollToPricing}
                className="px-8 py-4 text-lg bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold rounded-lg hover:-translate-y-0.5 transition-all duration-200 shadow-xl hover:shadow-accent-blue/50 mb-4"
              >
                Get Your Globe - $29
              </button>

              <p className="text-sm text-text-muted">
                One-time payment • 10,000 views/month • Lifetime updates
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 bg-space-card border border-space-border rounded-2xl hover:-translate-y-1 transition-all duration-200 hover:shadow-lg hover:shadow-accent-blue/20">
                <Zap className="w-12 h-12 text-accent-blue mb-4" aria-label="Real-Time Updates icon" />
                <h3 className="text-2xl font-bold mb-3">Real-Time Updates</h3>
                <p className="text-base text-text-secondary">
                  Visitors appear on your globe instantly. Updates every 10 seconds automatically.
                </p>
              </div>

              <div className="p-8 bg-space-card border border-space-border rounded-2xl hover:-translate-y-1 transition-all duration-200 hover:shadow-lg hover:shadow-accent-purple/20">
                <Globe className="w-12 h-12 text-accent-purple mb-4" aria-label="3D Visualization icon" />
                <h3 className="text-2xl font-bold mb-3">Beautiful 3D Visualization</h3>
                <p className="text-base text-text-secondary">
                  Stunning rotating Earth with smooth animations. Auto-detects visitor locations.
                </p>
              </div>

              <div className="p-8 bg-space-card border border-space-border rounded-2xl hover:-translate-y-1 transition-all duration-200 hover:shadow-lg hover:shadow-accent-blue/20">
                <Code className="w-12 h-12 text-accent-blue mb-4" aria-label="One-Line Install icon" />
                <h3 className="text-2xl font-bold mb-3">One-Line Install</h3>
                <p className="text-base text-text-secondary">
                  Paste one script tag. No setup, no config, no complexity. Works everywhere.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl font-bold text-center mb-16">How It Works</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-16 left-[16.666%] right-[16.666%] h-0.5 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-blue" aria-hidden="true"></div>

              <div className="flex flex-col items-center text-center relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple flex items-center justify-center text-4xl font-bold mb-6 relative z-10">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-3">Sign Up & Pay $29</h3>
                <p className="text-base text-text-secondary">
                  One-time payment. Get instant access to your dashboard.
                </p>
              </div>

              <div className="flex flex-col items-center text-center relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple flex items-center justify-center text-4xl font-bold mb-6 relative z-10">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-3">Copy Your Widget Code</h3>
                <p className="text-base text-text-secondary">
                  We generate a unique script tag just for you.
                </p>
              </div>

              <div className="flex flex-col items-center text-center relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple flex items-center justify-center text-4xl font-bold mb-6 relative z-10">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-3">Paste & Go Live</h3>
                <p className="text-base text-text-secondary">
                  Add the script to your website. Your globe appears instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-xl mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 rounded-3xl blur-3xl" aria-hidden="true"></div>

              <div className="relative p-8 rounded-3xl backdrop-blur-xl bg-white/5 border border-transparent shadow-2xl"
                style={{
                  borderImage: 'linear-gradient(to right, #3b82f6, #8b5cf6) 1',
                  boxShadow: '0 0 60px rgba(59, 130, 246, 0.2)'
                }}
              >
                <div className="absolute top-8 right-8">
                  <span className="px-3 py-1 bg-accent-green/20 text-accent-green text-xs font-medium rounded-full border border-accent-green/30">
                    One-Time Payment
                  </span>
                </div>

                <div className="text-center mb-8">
                  <div className="text-7xl font-bold mb-2">$29</div>
                  <div className="text-xl text-text-secondary font-medium">Lifetime Access</div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    'Beautiful 3D globe widget',
                    'Real-time visitor tracking',
                    '10,000 pageviews/month',
                    '1 website included',
                    'Lifetime updates',
                    'Email support',
                    'Small "Powered by" badge',
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-accent-green flex-shrink-0" aria-hidden="true" />
                      <span className="text-base text-text-primary">{feature}</span>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-text-muted text-center mb-6">
                  +$19 to remove watermark
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full h-14 px-4 bg-space-dark border border-space-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    required
                    aria-label="Email address"
                  />
                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold rounded-xl hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-accent-blue/50"
                  >
                    Get Started Now - $29
                  </button>
                </form>

                <p className="text-sm text-text-muted text-center mt-6">
                  30-day money-back guarantee
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-6">Ready to Show Off Your Global Reach?</h2>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Join indie hackers proudly displaying their visitor map
            </p>
            <button
              onClick={scrollToPricing}
              className="px-8 py-4 text-lg bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold rounded-lg hover:-translate-y-0.5 transition-all duration-200 shadow-xl hover:shadow-accent-blue/50 mb-4"
            >
              Get Your Globe - $29
            </button>
            <p className="text-sm text-text-muted">
              One-time • Instant access • 30-day guarantee
            </p>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-space-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-accent-blue" aria-hidden="true" />
              <span className="text-lg font-bold">MapMyVisitors</span>
            </div>

            <p className="text-text-secondary">
              Show the world where your visitors come from
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-text-secondary">
              <a href="/recover" className="hover:text-text-primary transition-colors">Recover Account</a>
              <span>•</span>
              <a href="#" className="hover:text-text-primary transition-colors">About</a>
              <span>•</span>
              <a href="#" className="hover:text-text-primary transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-text-primary transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-text-primary transition-colors">Contact</a>
            </div>

            <p className="text-sm text-text-muted">
              © 2024 MapMyVisitors. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
