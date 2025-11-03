"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Loader2,
  LogOut,
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Copy,
  CheckCircle,
} from "lucide-react"

interface Tradeshow {
  id: number
  name: string
  slug: string
  description: string
  location: string
  start_date: string
  end_date: string
  is_active: boolean
  submission_count: string
  created_by_name: string
  tags: Array<{ tag_name: string; tag_value: string }>
  submissions: Array<{
    id: number
    contact_email: string
    contact_name: string
    uploaded_at: string
    rep_name: string
    rep_code: string
  }>
}

export default function TradeshowDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [tradeshow, setTradeshow] = useState<Tradeshow | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user.role !== "admin") {
      router.push("/dashboard/rep")
      return
    }

    fetchTradeshowDetails()
  }, [session, status, router, params.id])

  const fetchTradeshowDetails = async () => {
    try {
      const response = await fetch(`/api/tradeshows/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setTradeshow(data)
      }
    } catch (error) {
      console.error("Error fetching tradeshow:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyFormUrl = () => {
    const formUrl = `${window.location.origin}/trade-show-lead/${tradeshow?.slug}`
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[rgb(27,208,118)]" />
      </div>
    )
  }

  if (!tradeshow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Tradeshow Not Found</CardTitle>
            <CardDescription>The requested tradeshow could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/trade-show-lead/${tradeshow.slug}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{tradeshow.name}</h1>
              <p className="text-sm text-gray-500">Tradeshow Details & Submissions</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Tradeshow Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">{tradeshow.name}</CardTitle>
                  <Badge
                    variant={tradeshow.is_active ? "default" : "secondary"}
                    className={tradeshow.is_active ? "bg-[rgb(27,208,118)]" : ""}
                  >
                    {tradeshow.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  {tradeshow.description || "No description"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {tradeshow.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium">{tradeshow.location}</span>
                </div>
              )}
              {tradeshow.start_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">
                    {new Date(tradeshow.start_date).toLocaleDateString()} -{" "}
                    {new Date(tradeshow.end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-5 w-5" />
                <span className="font-medium">{tradeshow.submission_count} submissions</span>
              </div>
            </div>

            {/* Form URL */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Public Form URL</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
                />
                <Button variant="outline" onClick={copyFormUrl}>
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => window.open(formUrl, "_blank")}
                  className="bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Form
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Share this URL with your team to collect leads for this tradeshow
              </p>
            </div>

            {/* Tags */}
            {tradeshow.tags && tradeshow.tags.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Tags & Settings</h3>
                <div className="space-y-2">
                  {tradeshow.tags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{tag.tag_name}</Badge>
                      <span className="text-gray-600">{tag.tag_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions ({tradeshow.submissions?.length || 0})</CardTitle>
            <CardDescription>
              All leads captured for this tradeshow
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tradeshow.submissions && tradeshow.submissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Contact Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Rep
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tradeshow.submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {submission.contact_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {submission.contact_email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {submission.rep_name || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(submission.uploaded_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No submissions yet</p>
                <p className="text-sm mt-2">Share the form URL to start collecting leads</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
