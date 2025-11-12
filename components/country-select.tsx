"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, X } from "lucide-react"

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

export function CountrySelect({
  value,
  onChange,
  className = "",
  disabled = false,
  required = false,
  allowEmpty = false,
  emptyLabel = "Select a country..."
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Set search term when value changes externally
  useEffect(() => {
    if (value) {
      setSearchTerm(value)
    }
  }, [value])

  // Filter countries based on search term
  const filteredCountries = countries.filter((country) =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
        // Reset search term to selected value if user clicks away
        if (value) {
          setSearchTerm(value)
        } else if (!allowEmpty) {
          setSearchTerm("")
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [value, allowEmpty])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [highlightedIndex])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)

    // Clear selection if user types something different
    if (newValue !== value) {
      onChange("")
    }
  }

  const handleSelectCountry = (country: Country) => {
    onChange(country.label)
    setSearchTerm(country.label)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleClear = () => {
    onChange("")
    setSearchTerm("")
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true)
      return
    }

    if (isOpen) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < filteredCountries.length - 1 ? prev + 1 : prev
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case "Enter":
          e.preventDefault()
          if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
            handleSelectCountry(filteredCountries[highlightedIndex])
          } else if (filteredCountries.length === 1) {
            handleSelectCountry(filteredCountries[0])
          }
          break
        case "Escape":
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          if (value) {
            setSearchTerm(value)
          }
          break
        case "Tab":
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
      }
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <input
          type="text"
          value="Loading countries..."
          disabled
          className="w-full"
          readOnly
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <input
          type="text"
          value={error}
          disabled
          className="w-full"
          readOnly
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id="country"
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={emptyLabel}
          disabled={disabled}
          required={required && !value}
          className={className}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value && allowEmpty && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              tabIndex={-1}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && filteredCountries.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredCountries.map((country, index) => (
            <div
              key={country.value}
              onClick={() => handleSelectCountry(country)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                highlightedIndex === index
                  ? "bg-[rgb(27,208,118)] text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              {country.label}
            </div>
          ))}
        </div>
      )}

      {isOpen && searchTerm && filteredCountries.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          No countries found matching "{searchTerm}"
        </div>
      )}
    </div>
  )
}
