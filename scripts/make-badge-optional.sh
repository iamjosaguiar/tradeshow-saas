#!/bin/bash

# Files to update
FILES=(
  "app/trade-show-lead/[slug]/page.tsx"
  "app/trade-show-lead/[slug]/[rep]/page.tsx"
  "app/trade-show-lead/page.tsx"
  "app/aa-tradeshow-lead/page.tsx"
  "app/aa-tradeshow-lead/[rep]/page.tsx"
)

cd "/Volumes/T7 Shield/Cursor Projects/Live Websites/Cleanspace Tradeshow App"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."

    # Change "Full Name" to "Name"
    sed -i '' 's/Full Name \*/Name */g' "$file"

    # Change "Upload Badge Photo *" to "Upload Badge Photo"
    sed -i '' 's/Upload Badge Photo \*/Upload Badge Photo/g' "$file"

    # Remove badge photo validation (the lines that check if badgePhoto is required)
    # This is the block:
    #     if (!formData.badgePhoto) {
    #       newErrors.badgePhoto = "Badge photo is required"
    #     }
    # We'll remove these 3 lines
    sed -i '' '/if (!formData\.badgePhoto) {/,/}/d' "$file"

    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "🎉 Badge photo is now optional and Full Name changed to Name!"
