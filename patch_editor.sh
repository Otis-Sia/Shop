#!/bin/bash
# 1. Add import for ProductAIAssistant
sed -i '13i import { ProductAIAssistant } from "./ProductAIAssistant";' src/app/admin/products/components/ProductEditor.tsx

# 2. Remove ProductMediaManager from left column
sed -i '/<ProductMediaManager/d' src/app/admin/products/components/ProductEditor.tsx

# 3. Add ProductMediaManager and ProductAIAssistant below Organization block in the right column
sed -i '/<\/select>/!b;n;n;n;n;n;n; a \
          <ProductMediaManager media={formData.media} onChange={(val) => handleUpdate('\''media'\'', val)} />\
          <ProductAIAssistant currentData={formData} onApply={(updates) => setFormData(prev => ({ ...prev, ...updates }))} />\
' src/app/admin/products/components/ProductEditor.tsx
