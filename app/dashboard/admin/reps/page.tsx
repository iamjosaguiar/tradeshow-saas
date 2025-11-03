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
  Users,
  Edit,
  Trash2,
  X,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react"

interface Rep {
  id: number
  email: string
  name: string
  rep_code: string
  dynamics_user_id: string | null
  created_at: string
  last_login: string | null
}

export default function RepsManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reps, setReps] = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [processing, setProcessing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    id: 0,
    email: "",
    name: "",
    rep_code: "",
    dynamics_user_id: "",
    password: "",
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

    fetchReps()
  }, [session, status, router])

  const fetchReps = async () => {
    try {
      const response = await fetch("/api/reps")
      if (response.ok) {
        const data = await response.json()
        setReps(data)
      }
    } catch (error) {
      console.error("Error fetching reps:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      id: 0,
      email: "",
      name: "",
      rep_code: "",
      dynamics_user_id: "",
      password: "",
    })
    setShowPassword(false)
  }

  const handleCreate = () => {
    resetForm()
    setModalMode("create")
    setShowModal(true)
  }

  const handleEdit = (rep: Rep) => {
    setFormData({
      id: rep.id,
      email: rep.email,
      name: rep.name,
      rep_code: rep.rep_code,
      dynamics_user_id: rep.dynamics_user_id || "",
      password: "",
    })
    setModalMode("edit")
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const url = modalMode === "create" ? "/api/reps" : "/api/reps"
      const method = modalMode === "create" ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        fetchReps()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save rep")
      }
    } catch (error) {
      console.error("Error saving rep:", error)
      alert("An error occurred")
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (rep: Rep) => {
    if (!confirm(`Are you sure you want to delete ${rep.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/reps?id=${rep.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchReps()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete rep")
      }
    } catch (error) {
      console.error("Error deleting rep:", error)
      alert("An error occurred")
    }
  }

  const handleSlugGeneration = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    setFormData({ ...formData, name, rep_code: slug })
  }

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
          <div className="flex items-center gap-4">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CleanSpace-R-TM-Logo-Green-with-Tagline-DMSOFH8BykYfZ70xuZ7yUXKGpEy6U9.png"
              alt="CleanSpace Logo"
              className="h-10"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sales Rep Management</h1>
              <p className="text-sm text-gray-500">Manage sales representatives and Dynamics 365 integration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/admin")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
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
              <CardTitle className="text-sm font-medium">Total Sales Reps</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reps.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dynamics Integrated</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reps.filter((r) => r.dynamics_user_id).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  reps.filter((r) => {
                    if (!r.last_login) return false
                    const lastLogin = new Date(r.last_login)
                    const thirtyDaysAgo = new Date()
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                    return lastLogin > thirtyDaysAgo
                  }).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sales Representatives</h2>
          <Button
            onClick={handleCreate}
            className="bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Rep
          </Button>
        </div>

        {/* Reps Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rep Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dynamics User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No sales representatives found. Click "Add New Rep" to get started.
                      </td>
                    </tr>
                  ) : (
                    reps.map((rep) => (
                      <tr key={rep.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{rep.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary">{rep.rep_code}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {rep.dynamics_user_id ? (
                            <div className="text-sm text-gray-900 font-mono truncate max-w-xs" title={rep.dynamics_user_id}>
                              {rep.dynamics_user_id}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Not configured</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rep.last_login
                            ? new Date(rep.last_login).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rep)}
                            className="mr-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rep)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0">
            <CardHeader className="bg-white border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {modalMode === "create" ? "Add New Sales Rep" : "Edit Sales Rep"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="text-gray-600 text-base mt-2">
                {modalMode === "create"
                  ? "Create a new sales representative account"
                  : "Update sales representative information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleSlugGeneration(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Rep Code *
                  </label>
                  <input
                    type="text"
                    value={formData.rep_code}
                    onChange={(e) => setFormData({ ...formData, rep_code: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                    required
                    placeholder="auto-generated-from-name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL-friendly identifier used in form links (auto-generated from name)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Dynamics 365 User ID
                  </label>
                  <input
                    type="text"
                    value={formData.dynamics_user_id}
                    onChange={(e) =>
                      setFormData({ ...formData, dynamics_user_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900 font-mono"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The systemuserid (GUID) from Dynamics 365 CRM. Leads will be assigned to this
                    user.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Password {modalMode === "edit" && "(leave blank to keep current)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(27,208,118)] focus:border-[rgb(27,208,118)] outline-none text-gray-900"
                      required={modalMode === "create"}
                      placeholder={modalMode === "edit" ? "Leave blank to keep current" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> The rep code will be used in form URLs like
                    /trade-show-lead/[slug]/{formData.rep_code || "rep-code"}
                  </p>
                </div>

                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border-2 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={processing}
                    className="flex-1 bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {modalMode === "create" ? "Creating..." : "Updating..."}
                      </>
                    ) : modalMode === "create" ? (
                      "Create Rep"
                    ) : (
                      "Update Rep"
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
