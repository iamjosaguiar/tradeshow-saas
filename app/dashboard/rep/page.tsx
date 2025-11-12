"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  LogOut,
  Calendar,
  MapPin,
  Copy,
  CheckCircle,
  ExternalLink,
  Users,
  Settings,
  Plus,
  X,
} from "lucide-react"
import { CountrySelect } from "@/components/country-select"

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
  created_at: string
}

export default function RepDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tradeshows, setTradeshows] = useState<Tradeshow[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<string>("newest")
  const [filterBy, setFilterBy] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    defaultCountry: "",
  })

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user.role !== "rep") {
      router.push("/dashboard/admin")
      return
    }

    fetchTradeshows()
  }, [session, status, router])

  const fetchTradeshows = async () => {
    try {
      const response = await fetch("/api/tradeshows")
      if (response.ok) {
        const data = await response.json()
        // Filter to only active tradeshows and order by latest
        const activeTradeshows = data.filter((t: Tradeshow) => t.is_active)
        setTradeshows(activeTradeshows)
      }
    } catch (error) {
      console.error("Error fetching tradeshows:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRepLink = (slug: string) => {
    const repCode = session?.user.repCode
    return `${window.location.origin}/trade-show-lead/${slug}/${repCode}`
  }

  const copyRepLink = (tradeshowId: number, slug: string) => {
    const link = getRepLink(slug)
    navigator.clipboard.writeText(link)
    setCopiedId(tradeshowId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSlugGeneration = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    setFormData({ ...formData, name, slug })
  }

  const handleCreateTradeshow = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch("/api/tradeshows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          location: formData.location,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          defaultCountry: formData.defaultCountry || null,
        }),
      })

      if (response.ok) {
        setShowCreateModal(false)
        setFormData({
          name: "",
          slug: "",
          description: "",
          location: "",
          startDate: "",
          endDate: "",
          defaultCountry: "",
        })
        fetchTradeshows()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create tradeshow")
      }
    } catch (error) {
      console.error("Error creating tradeshow:", error)
      alert("An error occurred")
    } finally {
      setCreating(false)
    }
  }

  const getFilteredAndSortedTradeshows = () => {
    let filtered = [...tradeshows]

    // Apply filter
    if (filterBy === "with-leads") {
      filtered = filtered.filter((t) => parseInt(t.submission_count) > 0)
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "most-leads":
          return parseInt(b.submission_count) - parseInt(a.submission_count)
        case "alphabetical":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }

  const displayedTradeshows = getFilteredAndSortedTradeshows()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[rgb(27,208,118)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rep Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome back, {session?.user.name}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/settings")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Info Card */}
        <Card className="mb-8 bg-gradient-to-r from-[rgb(27,208,118)] to-[rgb(4,45,35)] text-white border-0">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-2">Your Personalized Lead Capture Links</h2>
            <p className="text-white/90">
              Each tradeshow below has a unique link with your rep code. Share your link to capture leads and track your submissions!
            </p>
          </CardContent>
        </Card>

        {/* Create Button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Tradeshow
          </Button>
        </div>

        {/* Sort and Filter Controls */}
        {tradeshows.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="sort" className="text-sm font-semibold text-gray-700">
                    Sort by:
                  </label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-transparent"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="most-leads">Most Leads</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="filter" className="text-sm font-semibold text-gray-700">
                    Show:
                  </label>
                  <select
                    id="filter"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-transparent"
                  >
                    <option value="all">All Tradeshows</option>
                    <option value="with-leads">Only With My Leads</option>
                  </select>
                </div>

                <div className="ml-auto text-sm text-gray-600">
                  Showing {displayedTradeshows.length} of {tradeshows.length} tradeshows
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tradeshows Grid */}
        {displayedTradeshows.length === 0 && tradeshows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No Active Tradeshows</p>
              <p className="text-sm text-gray-500 mt-2">
                There are currently no active tradeshows. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : displayedTradeshows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No Tradeshows Match Your Filters</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your sort or filter options
              </p>
              <Button
                onClick={() => setFilterBy("all")}
                variant="outline"
                className="mt-4"
              >
                Show All Tradeshows
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTradeshows.map((tradeshow) => (
              <Card key={tradeshow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-[rgb(27,208,118)] text-white">Active</Badge>
                  </div>
                  <CardTitle className="text-xl">{tradeshow.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {tradeshow.description || "Lead capture form"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Tradeshow Info */}
                  <div className="space-y-2 text-sm">
                    {tradeshow.location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{tradeshow.location}</span>
                      </div>
                    )}
                    {tradeshow.start_date && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs">
                          {new Date(tradeshow.start_date).toLocaleDateString()} -{" "}
                          {new Date(tradeshow.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="font-semibold text-[rgb(27,208,118)]">
                        {tradeshow.submission_count} {tradeshow.submission_count === "1" ? "lead" : "leads"} captured by you
                      </span>
                    </div>
                  </div>

                  {/* Your Link Section */}
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Your Personalized Link:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={getRepLink(tradeshow.slug)}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs border rounded-lg bg-gray-50 truncate"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyRepLink(tradeshow.id, tradeshow.slug)}
                      className="flex-1"
                    >
                      {copiedId === tradeshow.id ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(getRepLink(tradeshow.slug), "_blank")}
                      className="flex-1 bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open Form
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">How to Use Your Links</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Each link is unique to you and tracks all submissions under your rep code</li>
              <li>Share your link via email, QR code, or directly at the tradeshow booth</li>
              <li>All leads captured through your link will be automatically attributed to you</li>
              <li>Contact your admin to view your submission analytics</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">Create New Tradeshow</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="text-gray-600 text-base mt-2">
                Create a new tradeshow event and get your personalized lead capture link
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateTradeshow} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleSlugGeneration(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Slug *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    required
                    placeholder="auto-generated-from-name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL-friendly identifier (auto-generated from name)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Default Country</label>
                  <CountrySelect
                    value={formData.defaultCountry}
                    onChange={(value) => setFormData({ ...formData, defaultCountry: value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    allowEmpty
                    emptyLabel="No default (users must select)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If set, this country will be pre-selected in the form for this tradeshow
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Your tradeshow will be visible to admins and you'll get a personalized link with your rep code.
                  </p>
                </div>

                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 border-2 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Tradeshow"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
