#!/bin/bash
head -n 1687 src/app/admin/products/page.tsx > temp_page.tsx

cat << 'INNER_EOF' >> temp_page.tsx
        <ProductEditor 
          isAdding={isAdding}
          initialData={editingId ? editForm : {}}
          onSave={async (data) => {
            try {
              const token = await auth.currentUser?.getIdToken();
              const res = await fetch(editingId ? \`/api/v1/products/\${editingId}\` : '/api/v1/products', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
                body: JSON.stringify(data)
              });
              const result = await res.json();
              if (res.ok) {
                showToast(\`Product successfully \${isAdding ? 'created' : 'updated'}\`, 'success');
                setIsAdding(false);
                setEditingId(null);
                // Optimistically update the list
                if (isAdding) {
                  setProducts([result.data, ...products]);
                } else {
                  setProducts(products.map(p => String(p.id) === String(editingId) ? result.data : p));
                }
              } else {
                showToast(result.message || 'Error saving product', 'error');
                throw new Error(result.message || 'Error saving product');
              }
            } catch (err: any) {
              console.error(err);
              throw err;
            }
          }}
          onCancel={() => {
            setIsAdding(false);
            setEditingId(null);
          }}
        />
INNER_EOF

tail -n +3020 src/app/admin/products/page.tsx >> temp_page.tsx

# Also insert import at the top
sed -i '13i import { ProductEditor } from "./components/ProductEditor";' temp_page.tsx

mv temp_page.tsx src/app/admin/products/page.tsx
