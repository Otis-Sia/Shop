"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Product } from "@/types/schema";

export default function MerchantProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const productsQuery = query(collection(db, "products"), where("merchantId", "==", user.uid));
        const snapshot = await getDocs(productsQuery);
        const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching merchant products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchProducts();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchProducts();
      });
      return () => unsubscribe();
    }
  }, []);

  if (loading) {
    return <div className="p-8">Loading products...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-headline-lg font-black text-4xl uppercase border-b-4 border-on-surface inline-block pb-2">
          My Products
        </h1>
        <button className="bg-primary-container text-on-surface border-4 border-on-surface px-6 py-2 font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          Add Product
        </button>
      </div>

      <div className="bg-surface border-4 border-on-surface overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-on-surface text-surface uppercase font-bold text-sm">
              <th className="p-4 border-b-4 border-on-surface">Image</th>
              <th className="p-4 border-b-4 border-on-surface">Name</th>
              <th className="p-4 border-b-4 border-on-surface">Price</th>
              <th className="p-4 border-b-4 border-on-surface">Stock</th>
              <th className="p-4 border-b-4 border-on-surface text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center font-bold">No products found. Add one to get started!</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                  <td className="p-4">
                    {product.imageUrls?.[0] ? (
                      <img src={product.imageUrls[0]} alt={product.name} className="w-16 h-16 object-cover border-2 border-on-surface" />
                    ) : (
                      <div className="w-16 h-16 bg-surface-dim border-2 border-on-surface flex items-center justify-center text-xs font-bold">No Img</div>
                    )}
                  </td>
                  <td className="p-4 font-bold">{product.name}</td>
                  <td className="p-4">${product.price.toFixed(2)}</td>
                  <td className="p-4">{product.stock}</td>
                  <td className="p-4 text-right">
                    <button className="text-sm border-2 border-on-surface px-3 py-1 font-bold hover:bg-on-surface hover:text-surface transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
