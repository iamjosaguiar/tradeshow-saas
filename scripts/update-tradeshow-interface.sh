#!/bin/bash

# Files to update
FILES=(
  "app/aa-tradeshow-lead/page.tsx"
  "app/aa-tradeshow-lead/[rep]/page.tsx"
  "app/trade-show-lead/page.tsx"
)

cd "/Volumes/T7 Shield/Cursor Projects/Live Websites/Cleanspace Tradeshow App"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."

    # Update the Tradeshow interface to include default_country
    sed -i '' 's/  end_date: string$/  end_date: string\
  default_country: string | null/g' "$file"

    # For files that have setTradeshow without the pre-populate logic, add it
    # Check if file already has the pre-populate logic
    if ! grep -q "Pre-populate country if default is set" "$file"; then
      # Add pre-populate logic after setTradeshow(data) or setTradeshow(tradeshowData)
      sed -i '' '/setTradeshow(data)$/a\
\
          \/\/ Pre-populate country if default is set\
          if (data.default_country) {\
            setFormData(prev => ({ ...prev, country: data.default_country }))\
          }
' "$file"

      sed -i '' '/setTradeshow(tradeshowData)$/a\
\
          \/\/ Pre-populate country if default is set\
          if (tradeshowData.default_country) {\
            setFormData(prev => ({ ...prev, country: tradeshowData.default_country }))\
          }
' "$file"
    fi

    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "🎉 All Tradeshow interfaces updated!"
