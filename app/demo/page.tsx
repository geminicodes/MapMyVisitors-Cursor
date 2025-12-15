'use client';

import InteractiveGlobe from '@/components/DemoGlobe';
import { ArrowRight, Globe, Users, Zap } from 'lucide-react';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section with Globe */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Live 3D Visualization</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            See Your Website Visitors
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              On a Stunning 3D Globe
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-8">
            MapMyVisitors turns boring analytics into beautiful 3D visualizations.
            Watch visitors appear in real-time on an interactive globe widget.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 border border-slate-700">
              View Documentation
            </button>
          </div>
        </div>

        {/* Globe Demo */}
        <div className="max-w-4xl mx-auto">
          <InteractiveGlobe />
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:bg-slate-800/70 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Beautiful 3D Visualization</h3>
            <p className="text-slate-400">
              Turn boring IP addresses into stunning geographic visualizations. Show off your global reach.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:bg-slate-800/70 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Real-Time Updates</h3>
            <p className="text-slate-400">
              See new visitors appear instantly on your globe. Recent visitors pulse with vibrant animations.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:bg-slate-800/70 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Easy Integration</h3>
            <p className="text-slate-400">
              Add to any website in minutes. One line of code. Works with React, Vue, WordPress, and more.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 mb-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Impress Your Visitors?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of developers showcasing their global reach with MapMyVisitors.
          </p>
          <button className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-xl">
            Start Your Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}
