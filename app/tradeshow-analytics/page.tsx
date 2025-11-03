"use client"

import { useEffect, useState } from "react"

interface AnalyticsData {
  canadianFrenchShow: {
    count: number
    latestSubmission: string | null
  }
  aaTradeshow: {
    count: number
    latestSubmission: string | null
  }
  totalSubmissions: number
}

export default function TradeshowAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tradeshow-analytics")

      if (!response.ok) {
        throw new Error("Failed to fetch analytics")
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Trade Show Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Track form submissions and performance across trade show events
          </p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {analytics && (
          <>
            {/* Total Submissions Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Total Submissions
              </h2>
              <p className="text-6xl font-bold text-blue-600">
                {analytics.totalSubmissions}
              </p>
            </div>

            {/* Individual Form Stats */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Canadian/French Show Card */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Canadian/French Show
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Tag ID: 6
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Submissions</p>
                    <p className="text-4xl font-bold text-gray-900">
                      {analytics.canadianFrenchShow.count}
                    </p>
                  </div>

                  {analytics.canadianFrenchShow.latestSubmission && (
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Latest Submission</p>
                      <p className="text-gray-900">
                        {new Date(analytics.canadianFrenchShow.latestSubmission).toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <a
                      href="/trade-show-lead"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Form →
                    </a>
                  </div>
                </div>
              </div>

              {/* A+A Tradeshow Card */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    A+A Tradeshow
                  </h2>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Tag ID: 7
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Submissions</p>
                    <p className="text-4xl font-bold text-gray-900">
                      {analytics.aaTradeshow.count}
                    </p>
                  </div>

                  {analytics.aaTradeshow.latestSubmission && (
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Latest Submission</p>
                      <p className="text-gray-900">
                        {new Date(analytics.aaTradeshow.latestSubmission).toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <a
                      href="/aa-tradeshow-lead"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Form →
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Bar */}
            {analytics.totalSubmissions > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Form Performance Comparison
                </h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">Canadian/French Show</span>
                      <span className="text-gray-600">
                        {((analytics.canadianFrenchShow.count / analytics.totalSubmissions) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all"
                        style={{
                          width: `${(analytics.canadianFrenchShow.count / analytics.totalSubmissions) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">A+A Tradeshow</span>
                      <span className="text-gray-600">
                        {((analytics.aaTradeshow.count / analytics.totalSubmissions) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-green-600 h-4 rounded-full transition-all"
                        style={{
                          width: `${(analytics.aaTradeshow.count / analytics.totalSubmissions) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
