"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user) {
      setIsRedirecting(true)
      // Redirect based on role
      if (session.user.role === "admin") {
        router.push("/dashboard/admin")
      } else {
        router.push("/dashboard/rep")
      }
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[rgb(27,208,118)] mx-auto mb-4" />
        <p className="text-white text-lg">
          {isRedirecting ? "Redirecting to your dashboard..." : "Loading..."}
        </p>
      </div>
    </div>
  )
}
