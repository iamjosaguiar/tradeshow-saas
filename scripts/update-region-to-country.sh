#!/bin/bash

# List of files to update
FILES=(
  "app/trade-show-lead/page.tsx"
  "app/aa-tradeshow-lead/page.tsx"
  "app/aa-tradeshow-lead/[rep]/page.tsx"
  "app/api/aa-tradeshow-lead/route.ts"
)

# Function to update region to country in a file
update_file() {
  local file="$1"
  echo "Updating $file..."

  # TypeScript interface fields
  sed -i '' 's/  region: string/  country: string/g' "$file"
  sed -i '' 's/  otherRegion: string/  otherCountry: string/g' "$file"
  sed -i '' 's/  region?: string/  country?: string/g' "$file"
  sed -i '' 's/  otherRegion?: string/  otherCountry?: string/g' "$file"

  # Initialization
  sed -i '' 's/    region: "",/    country: "",/g' "$file"
  sed -i '' 's/    otherRegion: "",/    otherCountry: "",/g' "$file"

  # Form data references
  sed -i '' 's/formData\.region/formData.country/g' "$file"
  sed -i '' 's/formData\.otherRegion/formData.otherCountry/g' "$file"

  # Error references
  sed -i '' 's/errors\.region/errors.country/g' "$file"
  sed -i '' 's/errors\.otherRegion/errors.otherCountry/g' "$file"

  # HTML IDs and htmlFor
  sed -i '' 's/id="region"/id="country"/g' "$file"
  sed -i '' 's/id="otherRegion"/id="otherCountry"/g' "$file"
  sed -i '' 's/htmlFor="region"/htmlFor="country"/g' "$file"
  sed -i '' 's/htmlFor="otherRegion"/htmlFor="otherCountry"/g' "$file"

  # Comments
  sed -i '' 's/{\/\* Region \*\}/{\/\* Country \*\}/g' "$file"
  sed -i '' 's/{\/\* Other Region \*\}/{\/\* Other Country \*\}/g' "$file"

  # Text labels
  sed -i '' 's/Region \*/Country */g' "$file"
  sed -i '' 's/Select a region\.\.\./Select a country.../g' "$file"

  # Validation messages
  sed -i '' 's/"Region is required"/"Country is required"/g' "$file"

  # API field names
  sed -i '' 's/formDataToSend\.append("region"/formDataToSend.append("country"/g' "$file"
  sed -i '' 's/formData\.get("region")/formData.get("country")/g' "$file"

  # Variable names
  sed -i '' 's/const region = /const country = /g' "$file"

  # ActiveCampaign comment
  sed -i '' 's/\/\/ Country (using for Region)/\/\/ Country/g' "$file"

  # Dynamics description
  sed -i '' 's/\\nRegion: /\\nCountry: /g' "$file"

  echo "✅ Updated $file"
}

# Navigate to project root
cd "/Volumes/T7 Shield/Cursor Projects/Live Websites/Cleanspace Tradeshow App"

# Update each file
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    update_file "$file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "🎉 All files updated successfully!"
