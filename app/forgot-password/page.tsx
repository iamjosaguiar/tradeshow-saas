"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Loader2, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to send reset email")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setIsLoading(false)
    } catch (error) {
      console.error("Forgot password error:", error)
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
          {/* Forgot Password Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <Badge className="mb-4 px-4 py-2 text-sm font-medium bg-[rgb(27,208,118)] text-white border-0 mx-auto">
                Password Reset
              </Badge>
              <CardTitle className="text-3xl md:text-4xl font-bold text-[rgb(4,45,35)] mb-2">
                Forgot Password?
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Enter your email and we'll send you a reset link
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              {success ? (
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h3>
                    <p className="text-gray-600">
                      If an account exists with that email, we've sent you a password reset link.
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                      The link will expire in 1 hour.
                    </p>
                  </div>
                  <div className="pt-4">
                    <Link href="/login">
                      <Button
                        variant="outline"
                        className="w-full border-2"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
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
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                      placeholder="your.email@cleanspacetechnology.com"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full px-8 py-6 text-lg font-bold bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white shadow-lg shadow-[rgb(27,208,118)]/25 hover:shadow-xl hover:shadow-[rgb(27,208,118)]/30 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-5 w-5" />
                          Send Reset Link
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Back to Login */}
                  <div className="text-center pt-4">
                    <Link
                      href="/login"
                      className="text-sm text-[rgb(27,208,118)] hover:text-[rgb(27,208,118)]/80 font-medium inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
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
