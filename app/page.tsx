/**
 * Root Domain Landing Page
 * Shows when accessing tradeshow-saas.vercel.app (no subdomain)
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 text-center">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-white tracking-tight">
            Tradeshow Lead Capture
          </h1>
          <p className="text-2xl text-slate-300">
            Multi-tenant SaaS Platform
          </p>
        </div>

        {/* Description */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 space-y-4">
          <p className="text-lg text-slate-200">
            Enterprise-grade lead capture solution for tradeshows and events with complete data isolation,
            custom branding, and per-tenant CRM integrations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-2">
            <div className="text-3xl">🔒</div>
            <h3 className="text-xl font-semibold text-white">Multi-Tenant</h3>
            <p className="text-sm text-slate-400">
              Complete data isolation with subdomain routing
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-2">
            <div className="text-3xl">🔄</div>
            <h3 className="text-xl font-semibold text-white">CRM Integration</h3>
            <p className="text-sm text-slate-400">
              ActiveCampaign, Dynamics 365, and more
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-2">
            <div className="text-3xl">🎨</div>
            <h3 className="text-xl font-semibold text-white">Custom Branding</h3>
            <p className="text-sm text-slate-400">
              Logo, colors, and domain per tenant
            </p>
          </div>
        </div>

        {/* Access Instructions */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-6 mt-12">
          <h3 className="text-xl font-semibold text-blue-300 mb-3">
            Access Your Account
          </h3>
          <p className="text-slate-300 mb-4">
            This platform uses subdomain-based tenant routing.
          </p>
          <div className="bg-slate-900/50 rounded-lg p-4 text-left">
            <p className="text-sm text-slate-400 mb-2">Example:</p>
            <code className="text-green-400 text-sm">
              https://your-company.tradeshow-saas.vercel.app
            </code>
          </div>
          <p className="text-sm text-slate-400 mt-4">
            Contact your administrator for your company's subdomain.
          </p>
          <div className="mt-6 space-x-4">
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Continue to Login
            </Link>
            <a
              href="https://github.com/iamjosaguiar/tradeshow-saas"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-lg transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="pt-8 space-y-4">
          <p className="text-sm text-slate-500">Built with</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <span className="px-3 py-1 bg-slate-800/50 rounded-full">Next.js 14</span>
            <span className="px-3 py-1 bg-slate-800/50 rounded-full">TypeScript</span>
            <span className="px-3 py-1 bg-slate-800/50 rounded-full">PostgreSQL</span>
            <span className="px-3 py-1 bg-slate-800/50 rounded-full">NextAuth</span>
            <span className="px-3 py-1 bg-slate-800/50 rounded-full">Tailwind CSS</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 text-sm text-slate-500">
          <p>
            ⚡ Built with{' '}
            <a
              href="https://claude.com/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Claude Code
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
