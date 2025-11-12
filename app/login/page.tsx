"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogIn, Loader2, AlertCircle, Building2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [accountName, setAccountName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [subdomain, setSubdomain] = useState<string | null>(null)
  const [tenantLogo, setTenantLogo] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)

  // Detect subdomain on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname

      // Check if we're on a subdomain
      if (hostname.includes('localhost')) {
        const parts = hostname.split('.')
        if (parts.length > 1 && parts[0] !== 'localhost') {
          setSubdomain(parts[0])
          fetchTenantBranding(parts[0])
        }
      } else {
        const parts = hostname.split('.')
        // tradeshow-saas.vercel.app or custom domain
        if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'tradeshow-saas') {
          setSubdomain(parts[0])
          fetchTenantBranding(parts[0])
        }
      }
    }
  }, [])

  // Fetch tenant branding
  const fetchTenantBranding = async (subdomainName: string) => {
    try {
      const response = await fetch(`/api/tenant?subdomain=${subdomainName}`)
      if (response.ok) {
        const tenant = await response.json()
        setTenantLogo(tenant.logo_url)
        setTenantName(tenant.name)
      }
    } catch (error) {
      console.error('Failed to fetch tenant branding:', error)
    }
  }

  // Handle account name submission (redirect to subdomain)
  const handleAccountNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validate that account exists
      const response = await fetch(`/api/tenant?subdomain=${accountName.toLowerCase()}`)

      if (!response.ok) {
        setError("Account not found. Please check your account name.")
        setIsLoading(false)
        return
      }

      // Redirect to subdomain
      const hostname = window.location.hostname
      let targetUrl = ''

      if (hostname.includes('localhost')) {
        targetUrl = `http://${accountName.toLowerCase()}.localhost:${window.location.port}/login`
      } else if (hostname.includes('vercel.app')) {
        targetUrl = `https://${accountName.toLowerCase()}.tradeshow-saas.vercel.app/login`
      } else {
        // Custom domain
        const baseDomain = hostname.split('.').slice(-2).join('.')
        targetUrl = `https://${accountName.toLowerCase()}.${baseDomain}/login`
      }

      window.location.href = targetUrl
    } catch (error) {
      console.error("Account lookup error:", error)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  // Handle credentials login
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setIsLoading(false)
        return
      }

      // Redirect to dashboard on successful login
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Login error:", error)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  // Root domain - Account name lookup
  if (!subdomain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-md shadow-lg">
          <div className="container mx-auto px-4 py-6 flex items-center justify-center">
            <h1 className="text-2xl font-bold text-white">Tradeshow Lead Capture</h1>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="max-w-md w-full">
            {/* Account Lookup Card */}
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center pb-6 pt-8">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-6 bg-gradient-to-br from-blue-500 to-slate-700 flex items-center justify-center shadow-lg">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                  Hey you, welcome back
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  LOGIN TO ACTIVECAMPAIGN
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleAccountNameSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Account Name Input */}
                  <div>
                    <label htmlFor="accountName" className="block text-sm font-semibold text-foreground mb-2">
                      Account Name
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        id="accountName"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-base"
                        placeholder="your-company"
                        disabled={isLoading}
                        required
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {typeof window !== 'undefined' && window.location.hostname.includes('localhost')
                          ? '.localhost'
                          : '.tradeshow-saas.vercel.app'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Login Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full px-8 py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-5 w-5" />
                          Login
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Forgot Account Name */}
                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                  <Link
                    href="/forgot-account-name"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot account name? →
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-white/10 bg-black/20">
          <div className="container mx-auto text-center">
            <p className="text-sm text-white/70">
              © 2025 Tradeshow Lead Capture. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    )
  }

  // Subdomain - Credentials login
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center">
          {tenantLogo ? (
            <img
              src={tenantLogo}
              alt={`${tenantName} Logo`}
              className="h-12"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">{tenantName || 'Tradeshow Lead Capture'}</h1>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="max-w-md w-full">
          {/* Login Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 bg-gradient-to-br from-blue-500 to-slate-700 flex items-center justify-center shadow-lg">
                <LogIn className="h-8 w-8 text-white" />
              </div>
              <Badge className="mb-4 px-4 py-2 text-sm font-medium bg-blue-600 text-white border-0 mx-auto">
                Sales Manager Portal
              </Badge>
              <CardTitle className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Sign In
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Enter your credentials to access the dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-base"
                    placeholder="your.email@company.com"
                    disabled={isLoading}
                    required
                  />
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-base"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    required
                  />
                </div>

                {/* Login Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-8 py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        Sign In
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-center text-muted-foreground">
                  Contact your administrator if you need assistance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/10 bg-black/20">
        <div className="container mx-auto text-center">
          <p className="text-sm text-white/70">
            © 2025 {tenantName || 'Tradeshow Lead Capture'}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
