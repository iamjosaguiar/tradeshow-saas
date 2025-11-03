"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, CheckCircle, Loader2, Calendar, MapPin } from "lucide-react"
import { track } from "@vercel/analytics"

interface FormData {
  email: string
  name: string
  region: string
  otherRegion: string
  comments: string
  company: string
  role: string
  workEnvironment: string
  numberOfStaff: string
  currentRespirator: string
  badgePhoto: File | null
}

interface FormErrors {
  email?: string
  name?: string
  region?: string
  otherRegion?: string
  badgePhoto?: string
}

interface Tradeshow {
  id: number
  name: string
  slug: string
  description: string
  location: string
  start_date: string
  end_date: string
  is_active: boolean
}

export default function TradeshowLeadForm() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [tradeshow, setTradeshow] = useState<Tradeshow | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    email: "",
    name: "",
    region: "",
    otherRegion: "",
    comments: "",
    company: "",
    role: "",
    workEnvironment: "",
    numberOfStaff: "",
    currentRespirator: "",
    badgePhoto: null,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Fetch tradeshow details
  useEffect(() => {
    const fetchTradeshow = async () => {
      try {
        const response = await fetch(`/api/tradeshows/by-slug/${slug}`)
        if (response.ok) {
          const data = await response.json()
          setTradeshow(data)

          // Track page view
          track("trade_show_form_view", { tradeshow: data.name })
        } else {
          console.error("Tradeshow not found")
        }
      } catch (error) {
        console.error("Error fetching tradeshow:", error)
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchTradeshow()
    }
  }, [slug])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.name) {
      newErrors.name = "Name is required"
    }

    if (!formData.region) {
      newErrors.region = "Region is required"
    }

    if (formData.region === "Other" && !formData.otherRegion.trim()) {
      newErrors.otherRegion = "Please specify your country"
    }

    if (!formData.badgePhoto) {
      newErrors.badgePhoto = "Badge photo is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, badgePhoto: "File size must be less than 10MB" })
        return
      }

      if (!file.type.startsWith("image/")) {
        setErrors({ ...errors, badgePhoto: "Please upload an image file" })
        return
      }

      setFormData({ ...formData, badgePhoto: file })
      setErrors({ ...errors, badgePhoto: undefined })

      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !tradeshow) {
      return
    }

    setIsSubmitting(true)

    try {
      track("trade_show_lead_form_submission", {
        tradeshow: tradeshow.name,
        hasCompany: !!formData.company,
      })

      const formDataToSend = new FormData()
      formDataToSend.append("email", formData.email)
      formDataToSend.append("name", formData.name)
      formDataToSend.append("region", formData.region === "Other" ? formData.otherRegion : formData.region)
      formDataToSend.append("comments", formData.comments)
      formDataToSend.append("company", formData.company)
      formDataToSend.append("role", formData.role)
      formDataToSend.append("workEnvironment", formData.workEnvironment)
      formDataToSend.append("numberOfStaff", formData.numberOfStaff)
      formDataToSend.append("currentRespirator", formData.currentRespirator)
      formDataToSend.append("tradeshowSlug", slug)
      if (formData.badgePhoto) {
        formDataToSend.append("badgePhoto", formData.badgePhoto)
      }

      const response = await fetch("/api/trade-show-lead", {
        method: "POST",
        body: formDataToSend,
      })

      if (!response.ok) {
        throw new Error("Form submission failed")
      }

      setShowSuccess(true)

      setTimeout(() => {
        setFormData({
          email: "",
          name: "",
          region: "",
          otherRegion: "",
          comments: "",
          company: "",
          role: "",
          workEnvironment: "",
          numberOfStaff: "",
          currentRespirator: "",
          badgePhoto: null,
        })
        setPhotoPreview(null)
        setShowSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Form submission error:", error)
      alert("There was an error submitting the form. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[rgb(27,208,118)]" />
      </div>
    )
  }

  if (!tradeshow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Tradeshow Not Found</CardTitle>
            <CardDescription>The requested tradeshow could not be found or is no longer active.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!tradeshow.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[rgb(4,45,35)] via-[rgb(4,45,35)] to-[rgb(27,208,118)]/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Tradeshow Inactive</CardTitle>
            <CardDescription>This tradeshow is no longer accepting submissions.</CardDescription>
          </CardHeader>
        </Card>
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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          {showSuccess && (
            <Card className="mb-6 border-2 border-[rgb(27,208,118)] bg-[rgb(27,208,118)]/10 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[rgb(27,208,118)] flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-white text-lg font-semibold">Thank you! Your submission has been received successfully.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <Badge className="mb-4 px-4 py-2 text-sm font-medium bg-[rgb(27,208,118)] text-white border-0 mx-auto">
                {tradeshow.name}
              </Badge>

              {/* Tradeshow Info */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-4 text-sm text-muted-foreground">
                {tradeshow.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{tradeshow.location}</span>
                  </div>
                )}
                {tradeshow.start_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(tradeshow.start_date).toLocaleDateString()} - {new Date(tradeshow.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <CardTitle className="text-3xl md:text-4xl font-bold text-[rgb(4,45,35)] mb-2">
                Contact Information
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {tradeshow.description || "Please fill out the form below. Fields marked with * are required."}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    } focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base`}
                    placeholder="your.email@company.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    } focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* Region */}
                <div>
                  <label htmlFor="region" className="block text-sm font-semibold text-foreground mb-2">
                    Region *
                  </label>
                  <select
                    id="region"
                    value={formData.region}
                    onChange={(e) => {
                      setFormData({ ...formData, region: e.target.value, otherRegion: "" })
                      setErrors({ ...errors, region: undefined, otherRegion: undefined })
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      errors.region ? "border-red-500" : "border-gray-300"
                    } focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base bg-white`}
                  >
                    <option value="">Select a region...</option>
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
                    <option value="Other">Other</option>
                  </select>
                  {errors.region && <p className="mt-1 text-sm text-red-500">{errors.region}</p>}
                </div>

                {/* Other Region */}
                {formData.region === "Other" && (
                  <div>
                    <label htmlFor="otherRegion" className="block text-sm font-semibold text-foreground mb-2">
                      Please specify your country *
                    </label>
                    <input
                      type="text"
                      id="otherRegion"
                      value={formData.otherRegion}
                      onChange={(e) => {
                        setFormData({ ...formData, otherRegion: e.target.value })
                        setErrors({ ...errors, otherRegion: undefined })
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        errors.otherRegion ? "border-red-500" : "border-gray-300"
                      } focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base`}
                      placeholder="Enter your country"
                    />
                    {errors.otherRegion && <p className="mt-1 text-sm text-red-500">{errors.otherRegion}</p>}
                  </div>
                )}

                {/* Discussion Comments */}
                <div>
                  <label htmlFor="comments" className="block text-sm font-semibold text-foreground mb-2">
                    Discussion Comments
                  </label>
                  <textarea
                    id="comments"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base resize-y"
                    placeholder="Any additional comments or questions from your discussion..."
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-foreground mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                    placeholder="Your company name"
                  />
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-semibold text-foreground mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                    placeholder="e.g., Safety Manager, Operations Director"
                  />
                </div>

                {/* Work Environment */}
                <div>
                  <label htmlFor="workEnvironment" className="block text-sm font-semibold text-foreground mb-2">
                    Work Environment
                  </label>
                  <input
                    type="text"
                    id="workEnvironment"
                    value={formData.workEnvironment}
                    onChange={(e) => setFormData({ ...formData, workEnvironment: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                    placeholder="e.g., Construction, Manufacturing, etc."
                  />
                </div>

                {/* Number of Staff */}
                <div>
                  <label htmlFor="numberOfStaff" className="block text-sm font-semibold text-foreground mb-2">
                    Number of Staff
                  </label>
                  <input
                    type="text"
                    id="numberOfStaff"
                    value={formData.numberOfStaff}
                    onChange={(e) => setFormData({ ...formData, numberOfStaff: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                    placeholder="e.g., 10-50"
                  />
                </div>

                {/* Current Respirator */}
                <div>
                  <label htmlFor="currentRespirator" className="block text-sm font-semibold text-foreground mb-2">
                    Current Respirator
                  </label>
                  <input
                    type="text"
                    id="currentRespirator"
                    value={formData.currentRespirator}
                    onChange={(e) => setFormData({ ...formData, currentRespirator: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[rgb(27,208,118)] focus:ring-2 focus:ring-[rgb(27,208,118)]/20 outline-none transition-all text-base"
                    placeholder="e.g., 3M 6000 Series"
                  />
                </div>

                {/* Badge Photo Upload */}
                <div>
                  <label htmlFor="badgePhoto" className="block text-sm font-semibold text-foreground mb-2">
                    Upload Badge Photo *
                  </label>
                  <div className="mt-2">
                    <label
                      htmlFor="badgePhoto"
                      className={`flex flex-col items-center justify-center w-full h-48 px-4 transition border-2 border-dashed rounded-lg cursor-pointer ${
                        errors.badgePhoto
                          ? "border-red-500 bg-red-50"
                          : photoPreview
                          ? "border-[rgb(27,208,118)] bg-[rgb(27,208,118)]/5"
                          : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      {photoPreview ? (
                        <div className="relative w-full h-full p-2">
                          <img
                            src={photoPreview}
                            alt="Badge preview"
                            className="w-full h-full object-contain rounded"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 text-center">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, JPEG (MAX. 10MB)</p>
                        </div>
                      )}
                      <input
                        id="badgePhoto"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                    {errors.badgePhoto && <p className="mt-1 text-sm text-red-500">{errors.badgePhoto}</p>}
                    {formData.badgePhoto && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: {formData.badgePhoto.name} ({(formData.badgePhoto.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-8 py-6 text-lg font-bold bg-[rgb(27,208,118)] hover:bg-[rgb(27,208,118)]/90 text-white shadow-lg shadow-[rgb(27,208,118)]/25 hover:shadow-xl hover:shadow-[rgb(27,208,118)]/30 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Form"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-white/70 text-sm mt-6">
            Your information will be securely processed and added to our contact list.
          </p>
        </div>
      </div>
    </div>
  )
}
