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
  Edit,
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
  default_country: string | null
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
  assignedReps?: Array<{ id: number; name: string; email: string; rep_code: string }>
}

interface Rep {
  id: number
  name: string
  email: string
  rep_code: string
}

export default function TradeshowDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [tradeshow, setTradeshow] = useState<Tradeshow | null>(null)
  const [reps, setReps] = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string>("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    defaultCountry: "",
    isActive: true,
    activeCampaignTagName: "",
  })
  const [selectedReps, setSelectedReps] = useState<number[]>([])
  const [repSearchTerm, setRepSearchTerm] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingTagName, setLoadingTagName] = useState(false)

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
    fetchReps()
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

  const fetchReps = async () => {
    try {
      const response = await fetch("/api/reps")
      if (response.ok) {
        const data = await response.json()
        // Filter to only include reps (not admins)
        const repsOnly = data.filter((user: Rep & { role: string }) => user.role === "rep")
        setReps(repsOnly)
      }
    } catch (error) {
      console.error("Error fetching reps:", error)
    }
  }

  const copyFormUrl = (url?: string) => {
    const urlToCopy = url || `${window.location.origin}/trade-show-lead/${tradeshow?.slug}`
    navigator.clipboard.writeText(urlToCopy)
    setCopied(true)
    setCopiedUrl(urlToCopy)
    setTimeout(() => {
      setCopied(false)
      setCopiedUrl("")
    }, 2000)
  }

  const openEditModal = () => {
    if (!tradeshow) return

    // Auto-generate tag name from tradeshow details
    const year = tradeshow.start_date ? new Date(tradeshow.start_date).getFullYear() : new Date().getFullYear()
    const defaultTagName = `Tradeshow: ${tradeshow.name} - ${year}`

    setEditFormData({
      name: tradeshow.name,
      description: tradeshow.description || "",
      location: tradeshow.location || "",
      startDate: tradeshow.start_date ? tradeshow.start_date.split("T")[0] : "",
      endDate: tradeshow.end_date ? tradeshow.end_date.split("T")[0] : "",
      defaultCountry: tradeshow.default_country || "",
      isActive: tradeshow.is_active,
      activeCampaignTagName: defaultTagName,
    })

    // Set selected reps from assigned reps
    setSelectedReps(tradeshow.assignedReps?.map((rep) => rep.id) || [])

    setShowEditModal(true)
  }

  const toggleRepSelection = (repId: number) => {
    setSelectedReps((prev) =>
      prev.includes(repId) ? prev.filter((id) => id !== repId) : [...prev, repId]
    )
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/tradeshows/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          description: editFormData.description,
          location: editFormData.location,
          startDate: editFormData.startDate || null,
          endDate: editFormData.endDate || null,
          defaultCountry: editFormData.defaultCountry || null,
          isActive: editFormData.isActive,
          activeCampaignTagName: editFormData.activeCampaignTagName || null,
          assignedReps: selectedReps,
        }),
      })

      if (response.ok) {
        setShowEditModal(false)
        fetchTradeshowDetails() // Refresh data
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update tradeshow")
      }
    } catch (error) {
      console.error("Error updating tradeshow:", error)
      alert("An error occurred while updating")
    } finally {
      setIsSubmitting(false)
    }
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
              <Button
                variant="outline"
                onClick={openEditModal}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
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

            {tradeshow.default_country && (
              <div className="mb-6">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Default Country: {tradeshow.default_country}
                </Badge>
              </div>
            )}

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
                <Button variant="outline" onClick={() => copyFormUrl()}>
                  {copied && copiedUrl === formUrl ? (
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

            {/* Admin Personal URL */}
            {session?.user.repCode && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Your Personal URL</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/trade-show-lead/${tradeshow.slug}/${session.user.repCode}`}
                    readOnly
                    className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyFormUrl(`${window.location.origin}/trade-show-lead/${tradeshow.slug}/${session.user.repCode}`)}
                  >
                    {copied && copiedUrl === `${window.location.origin}/trade-show-lead/${tradeshow.slug}/${session.user.repCode}` ? (
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
                    onClick={() => window.open(`${window.location.origin}/trade-show-lead/${tradeshow.slug}/${session.user.repCode}`, "_blank")}
                    className="bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Form
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Leads submitted through this URL will be attributed to you
                </p>
              </div>
            )}

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

            {/* Assigned Sales Managers */}
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Assigned Sales Managers</h3>
              {tradeshow.assignedReps && tradeshow.assignedReps.length > 0 ? (
                <div className="space-y-4">
                  {tradeshow.assignedReps.map((rep) => {
                    const repUrl = `${window.location.origin}/trade-show-lead/${tradeshow.slug}/${rep.rep_code}`
                    return (
                      <div key={rep.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 bg-[rgb(27,208,118)] rounded-full flex items-center justify-center text-white font-semibold">
                            {rep.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                            <div className="text-xs text-gray-500">{rep.email}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={repUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border rounded-lg bg-white text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyFormUrl(repUrl)}
                          >
                            {copied && copiedUrl === repUrl ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => window.open(repUrl, "_blank")}
                            className="bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No sales managers assigned to this tradeshow</p>
              )}
            </div>
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">Edit Tradeshow</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="text-gray-600 text-base mt-2">
                Update the details for this tradeshow event
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleEditSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
                    <input
                      type="date"
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Default Country</label>
                  <CountrySelect
                    value={editFormData.defaultCountry}
                    onChange={(value) => setEditFormData({ ...editFormData, defaultCountry: value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    allowEmpty
                    emptyLabel="No default (users must select)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If set, this country will be pre-selected in the form for this tradeshow
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isActive}
                      onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[rgb(27,208,118)] border-gray-300 rounded focus:ring-[rgb(27,208,118)]"
                    />
                    <span className="text-sm font-semibold text-gray-900">Active (visible to reps)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    ActiveCampaign Tag Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.activeCampaignTagName}
                    onChange={(e) => setEditFormData({ ...editFormData, activeCampaignTagName: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    placeholder="e.g., Tradeshow: Safety Expo - 2025"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Editing this will create a new tag in ActiveCampaign and apply it to future submissions
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Assign Sales Managers</label>
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
                      <p className="text-sm text-gray-500">No sales managers available</p>
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
                    Select which sales managers can access this tradeshow. {selectedReps.length} manager{selectedReps.length !== 1 ? "s" : ""} selected.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <strong>Note:</strong> Changing the name or dates will not update the slug/URL. The form URL will remain the same.
                  </p>
                </div>

                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 border-2 hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
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
