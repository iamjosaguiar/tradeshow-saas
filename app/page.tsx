"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogIn, Loader2 } from "lucide-react"
import { track } from "@vercel/analytics"

export default function RepLogin() {
  const router = useRouter()
  const [repCode, setRepCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!repCode.trim()) {
      setError("Please enter your rep code")
      return
    }

    setIsLoading(true)

    try {
      // Track login attempt
      track("rep_login_attempt", {
        repCode: repCode.toLowerCase(),
      })

      // Redirect to rep-specific page
      const formattedRepCode = repCode.trim().toLowerCase().replace(/\s+/g, "-")
      router.push(`/aa-tradeshow-lead/${formattedRepCode}`)
    } catch (error) {
      console.error("Login error:", error)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-R-TM-Logo-Green-with-Tagline-DMSOFH8BykYfZ70xuZ7yUXKGpEy6U9.png"
            alt="CleanSpace Logo"
            className="h-12"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="max-w-md w-full">
          {/* Login Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-lg">
                <LogIn className="h-8 w-8 text-white" />
              </div>
              <Badge className="mb-4 px-4 py-2 text-sm font-medium bg-[rgb(27,208,118)] text-white border-0 mx-auto">
                Sales Representative Portal
              </Badge>
              <CardTitle className="text-3xl md:text-4xl font-bold text-[rgb(4,45,35)] mb-2">
                Rep Login
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Enter your rep code to access your personalized lead capture form
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Rep Code Input */}
                <div>
                  <label htmlFor="repCode" className="block text-sm font-semibold text-foreground mb-2">
                    Rep Code
                  </label>
                  <input
                    type="text"
                    id="repCode"
                    value={repCode}
                    onChange={(e) => {
                      setRepCode(e.target.value)
                      setError("")
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      error ? "border-red-500" : "border-gray-300"
                    } focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base`}
                    placeholder="Enter your rep code"
                    disabled={isLoading}
                  />
                  {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                </div>

                {/* Login Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-8 py-6 text-lg font-bold bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white shadow-lg shadow-[rgb(27,208,118)]/25 hover:shadow-xl hover:shadow-[rgb(27,208,118)]/30 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Accessing Portal...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        Access Lead Form
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-center text-muted-foreground">
                  Need help? Contact your sales manager for your rep code.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="mt-6 text-center space-y-2">
            <a
              href="/tradeshow-analytics"
              className="block text-white/80 hover:text-white transition-colors text-sm font-medium"
            >
              View Analytics Dashboard
            </a>
            <a
              href="/trade-show-lead"
              className="block text-white/80 hover:text-white transition-colors text-sm font-medium"
            >
              General Lead Form (No Rep Code)
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/10 bg-black/20">
        <div className="container mx-auto text-center">
          <p className="text-sm text-white/70">
            © 2025 CleanSpace Technology. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
