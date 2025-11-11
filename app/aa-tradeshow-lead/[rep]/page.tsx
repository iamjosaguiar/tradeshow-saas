"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, CheckCircle, Loader2 } from "lucide-react"
import { track } from "@vercel/analytics"

interface FormData {
  email: string
  name: string
  country: string
  otherCountry: string
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
  country?: string
  otherCountry?: string
  badgePhoto?: string
}

const repNames: { [key: string]: string } = {
  jb: "JB",
  gabrielle: "Gabrielle",
  greg: "Greg",
  laurent: "Laurent",
  craig: "Craig",
  krister: "Krister",
  patrick: "Patrick",
  fabienne: "Fabienne",
}

export default function AATradeShowRepForm() {
  const params = useParams()
  const repSlug = params.rep as string
  const repName = repNames[repSlug?.toLowerCase()] || repSlug

  const [formData, setFormData] = useState<FormData>({
    email: "",
    name: "",
    country: "",
    otherCountry: "",
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

  // Track page view on mount
  useEffect(() => {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formSource: `aa-tradeshow-lead-${repSlug}` }),
    }).catch((error) => console.error("Failed to track view:", error))
  }, [repSlug])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.country) {
      newErrors.region = "Country is required"
    }

    if (formData.country === "Other" && !formData.otherCountry.trim()) {
      newErrors.otherRegion = "Please specify your country"
    }


    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const submitData = new FormData()
      submitData.append("email", formData.email)
      submitData.append("name", formData.name)
      submitData.append("region", formData.country === "Other" ? formData.otherCountry : formData.country)
      submitData.append("comments", formData.comments)
      submitData.append("company", formData.company)
      submitData.append("role", formData.role)
      submitData.append("workEnvironment", formData.workEnvironment)
      submitData.append("numberOfStaff", formData.numberOfStaff)
      submitData.append("currentRespirator", formData.currentRespirator)
      submitData.append("repName", repName) // Add rep name
      if (formData.badgePhoto) {
        submitData.append("badgePhoto", formData.badgePhoto)
      }

      const response = await fetch("/api/aa-tradeshow-lead", {
        method: "POST",
        body: submitData,
      })

      if (!response.ok) {
        throw new Error("Failed to submit form")
      }

      track("Form Submitted", { form: `A+A Tradeshow - ${repName}` })

      setShowSuccess(true)
      setTimeout(() => {
        setFormData({
          email: "",
          name: "",
          country: "",
          otherCountry: "",
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
      console.error("Submission error:", error)
      alert("Failed to submit form. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const regions = [
    "Germany",
    "France",
    "United Kingdom",
    "Spain",
    "Italy",
    "Netherlands",
    "Belgium",
    "Switzerland",
    "Austria",
    "Poland",
    "Sweden",
    "Other",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader className="space-y-1 text-center pb-6">
          <Badge className="mx-auto mb-2 bg-blue-600">A+A Tradeshow Lead Capture</Badge>
          {repName && (
            <Badge className="mx-auto mb-2 bg-green-600">Rep: {repName}</Badge>
          )}
          <CardTitle className="text-3xl font-bold">Lead Information</CardTitle>
          <CardDescription>
            Please fill in your details. Fields marked with * are required.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {showSuccess ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-2xl font-semibold text-green-700">Thank You!</h3>
              <p className="text-gray-600">Your information has been submitted successfully.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="your.email@company.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Full Name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value, otherRegion: "" })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.country ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select your region</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
              </div>

              {/* Other Region Input */}
              {formData.country === "Other" && (
                <div>
                  <label htmlFor="otherCountry" className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify your country *
                  </label>
                  <input
                    id="otherCountry"
                    type="text"
                    value={formData.otherCountry}
                    onChange={(e) => setFormData({ ...formData, otherRegion: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.otherCountry ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your country"
                  />
                  {errors.otherCountry && <p className="text-red-500 text-sm mt-1">{errors.otherCountry}</p>}
                </div>
              )}

              {/* Comments */}
              <div>
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                  Comments
                </label>
                <textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional comments or discussion points..."
                />
              </div>

              {/* Company Name */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Company Name"
                />
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <input
                  id="role"
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Safety Manager, Operations Director"
                />
              </div>

              {/* Work Environment */}
              <div>
                <label htmlFor="workEnvironment" className="block text-sm font-medium text-gray-700 mb-2">
                  Work Environment
                </label>
                <input
                  id="workEnvironment"
                  type="text"
                  value={formData.workEnvironment}
                  onChange={(e) => setFormData({ ...formData, workEnvironment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manufacturing, Construction"
                />
              </div>

              {/* Number of Staff */}
              <div>
                <label htmlFor="numberOfStaff" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Staff
                </label>
                <input
                  id="numberOfStaff"
                  type="text"
                  value={formData.numberOfStaff}
                  onChange={(e) => setFormData({ ...formData, numberOfStaff: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 50-100"
                />
              </div>

              {/* Current Respirator */}
              <div>
                <label htmlFor="currentRespirator" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Respirator
                </label>
                <input
                  id="currentRespirator"
                  type="text"
                  value={formData.currentRespirator}
                  onChange={(e) => setFormData({ ...formData, currentRespirator: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 3M 6000 Series"
                />
              </div>

              {/* Badge Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Badge Photo *
                </label>
                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-2 text-center">
                    {photoPreview ? (
                      <div className="mb-4">
                        <img
                          src={photoPreview}
                          alt="Badge preview"
                          className="mx-auto h-32 w-auto rounded-lg"
                        />
                      </div>
                    ) : (
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="badge-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>{photoPreview ? "Change photo" : "Upload a photo"}</span>
                        <input
                          id="badge-upload"
                          name="badge-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                {errors.badgePhoto && <p className="text-red-500 text-sm mt-1">{errors.badgePhoto}</p>}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Lead"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
