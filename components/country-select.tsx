"use client"

import { useState, useEffect } from "react"

interface Country {
  label: string
  value: number
}

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  required?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}

export function CountrySelect({ value, onChange, className = "", disabled = false, required = false, allowEmpty = false, emptyLabel = "Select a country..." }: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCountries() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/dynamics/countries")

        if (!response.ok) {
          throw new Error("Failed to fetch countries")
        }

        const data = await response.json()
        setCountries(data)
      } catch (err) {
        console.error("Error fetching countries:", err)
        setError("Failed to load countries. Please refresh the page.")
      } finally {
        setLoading(false)
      }
    }

    fetchCountries()
  }, [])

  if (loading) {
    return (
      <select
        id="country"
        className={className}
        disabled
        required={required}
      >
        <option value="">Loading countries...</option>
      </select>
    )
  }

  if (error) {
    return (
      <select
        id="country"
        className={className}
        disabled
        required={required}
      >
        <option value="">{error}</option>
      </select>
    )
  }

  return (
    <select
      id="country"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
      required={required}
    >
      <option value="">{emptyLabel}</option>
      {countries.map((country) => (
        <option key={country.value} value={country.label}>
          {country.label}
        </option>
      ))}
    </select>
  )
}
