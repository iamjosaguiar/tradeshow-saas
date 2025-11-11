"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Loader2,
  LogOut,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Eye,
  X,
  Settings,
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
  created_at: string
  submission_count: string
  created_by_name: string
  tags: Array<{ tag_name: string; tag_value: string }>
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tradeshows, setTradeshows] = useState<Tradeshow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sortBy, setSortBy] = useState<string>("newest")
  const [filterBy, setFilterBy] = useState<string>("all")

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

    if (session?.user.role !== "admin") {
      router.push("/dashboard/rep")
      return
    }

    fetchTradeshows()
  }, [session, status, router])

  const fetchTradeshows = async () => {
    try {
      const response = await fetch("/api/tradeshows")
      if (response.ok) {
        const data = await response.json()
        setTradeshows(data)
      }
    } catch (error) {
      console.error("Error fetching tradeshows:", error)
    } finally {
      setLoading(false)
    }
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

  const handleSlugGeneration = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    setFormData({ ...formData, name, slug })
  }

  const getFilteredAndSortedTradeshows = () => {
    let filtered = [...tradeshows]

    // Apply filter
    if (filterBy === "active") {
      filtered = filtered.filter((t) => t.is_active)
    } else if (filterBy === "inactive") {
      filtered = filtered.filter((t) => !t.is_active)
    } else if (filterBy === "with-submissions") {
      filtered = filtered.filter((t) => parseInt(t.submission_count) > 0)
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "most-submissions":
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

  const totalSubmissions = tradeshows.reduce(
    (sum, t) => sum + parseInt(t.submission_count || "0"),
    0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-R-TM-Logo-Green-with-Tagline-DMSOFH8BykYfZ70xuZ7yUXKGpEy6U9.png"
              alt="CleanSpace Logo"
              className="h-10"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome, {session?.user?.name}</p>
            </div>
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tradeshows</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tradeshows.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tradeshows</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tradeshows.filter((t) => t.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubmissions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Tradeshow Management</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push("/dashboard/admin/reps")}
              variant="outline"
              className="border-2"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Sales Reps
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Tradeshow
            </Button>
          </div>
        </div>

        {/* Sort and Filter Controls */}
        {tradeshows.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="admin-sort" className="text-sm font-semibold text-gray-700">
                    Sort by:
                  </label>
                  <select
                    id="admin-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-transparent"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="most-submissions">Most Submissions</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="admin-filter" className="text-sm font-semibold text-gray-700">
                    Show:
                  </label>
                  <select
                    id="admin-filter"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-transparent"
                  >
                    <option value="all">All Tradeshows</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="with-submissions">With Submissions</option>
                  </select>
                </div>

                <div className="ml-auto text-sm text-gray-600">
                  Showing {displayedTradeshows.length} of {tradeshows.length} tradeshows
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tradeshows List */}
        <div className="grid grid-cols-1 gap-6">
          {displayedTradeshows.length === 0 && tradeshows.length > 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
            displayedTradeshows.map((tradeshow) => (
            <Card
              key={tradeshow.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/admin/tradeshows/${tradeshow.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{tradeshow.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {tradeshow.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={tradeshow.is_active ? "default" : "secondary"}
                    className={tradeshow.is_active ? "bg-[rgb(27,208,118)]" : ""}
                  >
                    {tradeshow.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {tradeshow.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{tradeshow.location}</span>
                    </div>
                  )}
                  {tradeshow.start_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(tradeshow.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{tradeshow.submission_count} submissions</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/admin/tradeshows/${tradeshow.id}`)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>
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
                Fill in the details to create a new tradeshow event
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
                  <select
                    value={formData.defaultCountry}
                    onChange={(e) => setFormData({ ...formData, defaultCountry: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                  >
                    <option value="">No default (users must select)</option>
                    <option value="France">France</option>
                    <option value="Nordics">Nordics</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="Austria">Austria</option>
                    <option value="Switzerland - German">Switzerland - German</option>
                    <option value="Switzerland - French">Switzerland - French</option>
                    <option value="North America">North America</option>
                    <option value="South America">South America</option>
                    <option value="APAC">APAC</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    If set, this country will be pre-selected in the form for this tradeshow
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> An ActiveCampaign tag will be automatically created based on the tradeshow name and year (e.g., "Tradeshow: {formData.name || 'Name'} - {formData.startDate ? new Date(formData.startDate).getFullYear() : 'Year'}").
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
