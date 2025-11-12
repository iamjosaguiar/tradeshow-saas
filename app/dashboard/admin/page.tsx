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
  UserCircle,
  Archive,
  Trash2,
  ArchiveRestore,
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
  created_at: string
  submission_count: string
  created_by_name: string
  created_by_role?: string
  tags: Array<{ tag_name: string; tag_value: string }>
  assignedReps?: Array<{ id: number; name: string; email: string }>
}

interface Rep {
  id: number
  name: string
  email: string
  rep_code: string
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tradeshows, setTradeshows] = useState<Tradeshow[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sortBy, setSortBy] = useState<string>("newest")
  const [filterBy, setFilterBy] = useState<string>("active")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [tradeshowToDelete, setTradeshowToDelete] = useState<{ id: number; name: string } | null>(null)
  const [selectedReps, setSelectedReps] = useState<number[]>([])
  const [repSearchTerm, setRepSearchTerm] = useState("")

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
    fetchReps()
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

  const fetchReps = async () => {
    try {
      const response = await fetch("/api/reps")
      if (response.ok) {
        const data = await response.json()
        // Include both admins and reps for assignment
        setReps(data)
      }
    } catch (error) {
      console.error("Error fetching reps:", error)
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
          assignedReps: selectedReps,
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
        setSelectedReps([])
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

  const toggleRepSelection = (repId: number) => {
    setSelectedReps((prev) =>
      prev.includes(repId) ? prev.filter((id) => id !== repId) : [...prev, repId]
    )
  }

  const handleToggleActive = async (tradeshowId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setTogglingId(tradeshowId)

    try {
      const response = await fetch(`/api/tradeshows/${tradeshowId}/toggle-active`, {
        method: "POST",
      })

      if (response.ok) {
        fetchTradeshows()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to toggle tradeshow status")
      }
    } catch (error) {
      console.error("Error toggling tradeshow:", error)
      alert("An error occurred")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteClick = (tradeshowId: number, tradeshowName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTradeshowToDelete({ id: tradeshowId, name: tradeshowName })
    setShowDeleteModal(true)
    setDeleteConfirmation("")
  }

  const handleDeleteConfirm = async () => {
    if (!tradeshowToDelete) return

    setDeletingId(tradeshowToDelete.id)

    try {
      const response = await fetch(`/api/tradeshows/${tradeshowToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShowDeleteModal(false)
        setTradeshowToDelete(null)
        setDeleteConfirmation("")
        fetchTradeshows()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete tradeshow")
      }
    } catch (error) {
      console.error("Error deleting tradeshow:", error)
      alert("An error occurred")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setTradeshowToDelete(null)
    setDeleteConfirmation("")
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
    } else if (filterBy === "tradeshows") {
      filtered = filtered.filter((t) => t.created_by_role !== "rep")
    } else if (filterBy === "mini-events") {
      filtered = filtered.filter((t) => t.created_by_role === "rep")
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
              Manage Sales Managers
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
                    <option value="all">All Events</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="with-submissions">With Submissions</option>
                    <option value="tradeshows">Tradeshows Only</option>
                    <option value="mini-events">Self Managed Events Only</option>
                  </select>
                </div>

                <div className="ml-auto text-sm text-gray-600">
                  Showing {displayedTradeshows.length} of {tradeshows.length} events
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
                    {tradeshow.created_by_name && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <UserCircle className="h-3.5 w-3.5" />
                        <span>Created by: {tradeshow.created_by_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge
                      variant={tradeshow.is_active ? "default" : "secondary"}
                      className={tradeshow.is_active ? "bg-[rgb(27,208,118)]" : ""}
                    >
                      {tradeshow.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {tradeshow.created_by_role === "rep" && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Self Managed Event
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
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

                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={(e) => handleDeleteClick(tradeshow.id, tradeshow.name, e)}
                        disabled={deletingId === tradeshow.id}
                      >
                        {deletingId === tradeshow.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>

                    <button
                      onClick={(e) => handleToggleActive(tradeshow.id, e)}
                      disabled={togglingId === tradeshow.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 ${
                        tradeshow.is_active
                          ? "focus:ring-[rgb(27,208,118)]"
                          : "focus:ring-red-500"
                      } focus:ring-offset-2 ${
                        togglingId === tradeshow.id
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer"
                      } ${
                        tradeshow.is_active ? "bg-[rgb(27,208,118)]" : "bg-red-500"
                      }`}
                      title={tradeshow.is_active ? "Click to archive" : "Click to activate"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tradeshow.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
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

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Assign Team Members</label>
                  {reps.length > 0 && (
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={repSearchTerm}
                      onChange={(e) => setRepSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 mb-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-sm"
                    />
                  )}
                  <div className="border-2 border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                    {reps.length === 0 ? (
                      <p className="text-sm text-gray-500">No team members available</p>
                    ) : (
                      <div className="space-y-2">
                        {reps
                          .filter((rep) => {
                            const searchLower = repSearchTerm.toLowerCase()
                            return (
                              rep.name.toLowerCase().includes(searchLower) ||
                              rep.email.toLowerCase().includes(searchLower)
                            )
                          })
                          .map((rep) => (
                            <label
                              key={rep.id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedReps.includes(rep.id)}
                                onChange={() => toggleRepSelection(rep.id)}
                                className="w-4 h-4 text-[rgb(27,208,118)] border-gray-300 rounded focus:ring-[rgb(27,208,118)]"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                                <div className="text-xs text-gray-500">{rep.email}</div>
                              </div>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which team members can access this tradeshow. {selectedReps.length} selected.
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && tradeshowToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-0">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Trash2 className="h-6 w-6 text-red-600" />
                  Delete Tradeshow
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteCancel}
                  className="hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Warning: This action cannot be undone!</p>
                  <p className="text-sm text-red-700">
                    You are about to permanently delete <strong>"{tradeshowToDelete.name}"</strong> and all associated submissions and badge photos.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Type <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono text-sm">delete this tradeshow</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900"
                    placeholder="Type here to confirm..."
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDeleteCancel}
                    className="flex-1 border-2 hover:bg-gray-50"
                    disabled={deletingId === tradeshowToDelete.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={deleteConfirmation !== "delete this tradeshow" || deletingId === tradeshowToDelete.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === tradeshowToDelete.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Permanently
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
