"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("No reset token provided")
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await response.json()

        if (response.ok && data.valid) {
          setTokenValid(true)
        } else {
          setError(data.error || "Invalid or expired reset token")
        }
      } catch (error) {
        setError("Failed to validate reset token")
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to reset password")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setIsLoading(false)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      console.error("Reset password error:", error)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[rgb(27,208,118)]" />
      </div>
    )
  }

  if (!tokenValid && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20">
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-md shadow-lg">
          <div className="container mx-auto px-4 py-6 flex items-center justify-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-R-TM-Logo-Green-with-Tagline-DMSOFH8BykYfZ70xuZ7yUXKGpEy6U9.png"
              alt="CleanSpace Logo"
              className="h-12"
            />
          </div>
        </header>
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <Card className="max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Invalid or Expired Link</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link href="/forgot-password">
                <Button className="bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90">
                  Request New Reset Link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
          {/* Reset Password Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 bg-gradient-to-br from-[rgb(27,208,118)] to-[rgb(4,45,35)] flex items-center justify-center shadow-lg">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <Badge className="mb-4 px-4 py-2 text-sm font-medium bg-[rgb(27,208,118)] text-white border-0 mx-auto">
                Password Reset
              </Badge>
              <CardTitle className="text-3xl md:text-4xl font-bold text-[rgb(4,45,35)] mb-2">
                {success ? "Password Reset!" : "Set New Password"}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {success ? "Your password has been successfully reset" : "Enter your new password below"}
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
                    <p className="text-gray-600 mb-4">
                      You can now log in with your new password.
                    </p>
                    <p className="text-sm text-gray-500">
                      Redirecting to login page...
                    </p>
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

                  {/* New Password Input */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                        placeholder="Enter new password"
                        disabled={isLoading}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                        placeholder="Confirm new password"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
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
                          Resetting Password...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-5 w-5" />
                          Reset Password
                        </>
                      )}
                    </Button>
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
