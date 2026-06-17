"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import OnboardingPopup from "@/components/merchant/OnboardingPopup";
import Link from "next/link";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  Plus, 
  Settings, 
  Store 
} from "lucide-react";

export default function MerchantDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, lowStock: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Fetch Merchant Profile
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
          setProfile(userDocSnap.data());
        }

        // 2. Fetch Merchant Products and check variant stocks
        const productsQuery = query(collection(db, "products"), where("merchantId", "==", user.uid));
        const productsSnapshot = await getDocs(productsQuery);
        const productsCount = productsSnapshot.size;

        const productsListPromises = productsSnapshot.docs.map(async (docSnap) => {
          const product = { id: docSnap.id, ...docSnap.data() } as any;
          // Only query variants subcollection if hasVariants is true and trackInventory is active
          if (product.hasVariants && product.trackInventory !== false) {
            try {
              const variantsSnap = await getDocs(collection(db, "products", docSnap.id, "variants"));
              product.variants = variantsSnap.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() }));
            } catch (err) {
              console.error(`Error fetching variants for product ${docSnap.id}:`, err);
              product.variants = [];
            }
          }
          return product;
        });

        const productsList = await Promise.all(productsListPromises);

        // Calculate Low Stock list
        const lowStockList: any[] = [];
        for (const product of productsList) {
          // Skip if tracking is off or stock is null
          if (product.trackInventory === false || product.stock === null || product.stock === undefined) {
            continue;
          }

          if (product.hasVariants) {
            const variants = product.variants || [];
            for (const variant of variants) {
              if (variant.stock !== null && variant.stock !== undefined && variant.stock <= 5) {
                lowStockList.push({
                  productId: product.id,
                  name: product.name,
                  image: variant.imageUrl || product.imageUrls?.[0] || '',
                  variantName: variant.name || `${variant.size || ''} ${variant.color || ''}`.trim() || 'Variant',
                  stock: variant.stock,
                });
              }
            }
          } else {
            if (product.stock !== null && product.stock !== undefined && product.stock <= 5) {
              lowStockList.push({
                productId: product.id,
                name: product.name,
                image: product.imageUrls?.[0] || '',
                variantName: null,
                stock: product.stock,
              });
            }
          }
        }

        // 3. Fetch Merchant Orders
        const ordersQuery = query(collection(db, "orders"), where("merchantId", "==", user.uid));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersCount = ordersSnapshot.size;

        let totalRevenue = 0;
        const ordersList: any[] = [];
        ordersSnapshot.forEach((docSnap) => {
          const oData = { id: docSnap.id, ...docSnap.data() } as any;
          totalRevenue += oData.totalAmount || 0;
          ordersList.push(oData);
        });

        // Sort client-side: newest first
        ordersList.sort((a, b) => {
          const timeA = a.createdAt ? (a.createdAt as { seconds?: number }).seconds || 0 : 0;
          const timeB = b.createdAt ? (b.createdAt as { seconds?: number }).seconds || 0 : 0;
          return timeB - timeA;
        });

        const recent = ordersList.slice(0, 5);

        setStats({
          products: productsCount,
          orders: ordersCount,
          revenue: totalRevenue,
          lowStock: lowStockList.length
        });
        setRecentOrders(recent);
        setLowStockProducts(lowStockList);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      fetchDashboardData();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) fetchDashboardData();
      });
      return () => unsubscribe();
    }
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-12 w-64 bg-on-surface/10 border-4 border-on-surface/10 rounded-none"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-on-surface/10 border-4 border-on-surface/10 rounded-none"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-on-surface/10 border-4 border-on-surface/10 rounded-none"></div>
          <div className="h-96 bg-on-surface/10 border-4 border-on-surface/10 rounded-none"></div>
        </div>
      </div>
    );
  }

  // Color mappings for order status badges
  const statusColors: Record<string, string> = {
    pending: "bg-surface-container-highest text-on-surface border-on-surface",
    paid: "bg-primary-container text-on-primary-container border-on-surface",
    processing: "bg-primary-container text-on-primary-container border-on-surface",
    shipped: "bg-on-surface text-surface border-on-surface",
    delivered: "bg-green-500 text-white border-on-surface",
    cancelled: "border-error text-error bg-error-container",
  };

  const isStockCritical = stats.lowStock > 0;

  return (
    <div className="p-8 space-y-10">
      <OnboardingPopup />

      {/* Header Panel */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b-4 border-on-surface">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-primary-container font-extrabold uppercase tracking-widest text-xs">
            <Store size={14} />
            <span>Store Portal</span>
          </div>
          <h1 className="font-headline-md text-4xl font-black text-on-surface uppercase tracking-tight">
            {profile?.storeName ? `${profile.storeName}` : "My Merchant Hub"}
          </h1>
          <p className="font-body-md text-on-surface/75 mt-1 font-medium">
            Welcome back! Here is your business overview.
          </p>
        </div>
        
        {/* Quick Top Actions */}
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Link
            href="/merchant/products"
            className="flex items-center justify-center gap-2 bg-primary-container text-on-surface px-4 py-2 border-2 border-on-surface text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_var(--color-on-surface)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_var(--color-on-surface)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_var(--color-on-surface)] transition-all"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/merchant/settings"
            className="flex items-center justify-center gap-2 bg-surface text-on-surface px-4 py-2 border-2 border-on-surface text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_var(--color-on-surface)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_var(--color-on-surface)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_var(--color-on-surface)] transition-all"
          >
            <Settings size={14} />
            <span>Settings</span>
          </Link>
        </div>
      </header>

      {/* KPI Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="bg-primary-container text-on-surface p-6 border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-start">
            <Package size={28} className="text-on-surface stroke-[2]" />
            <Link href="/merchant/products" className="text-on-surface hover:text-on-surface/80">
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-on-surface/80">Total Products</h3>
            <p className="text-4xl font-black mt-1">{stats.products}</p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-secondary-container text-on-surface p-6 border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-start">
            <ShoppingCart size={28} className="text-on-surface stroke-[2]" />
            <Link href="/merchant/orders" className="text-on-surface hover:text-on-surface/80">
              <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-on-surface/80">Total Orders</h3>
            <p className="text-4xl font-black mt-1">{stats.orders}</p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-surface text-on-surface p-6 border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-start">
            <TrendingUp size={28} className="text-on-surface stroke-[2]" />
            <span className="text-[10px] font-black uppercase tracking-wider bg-on-surface text-surface px-1.5 py-0.5 border border-on-surface">Gross</span>
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-on-surface/80">Total Sales</h3>
            <p className="text-3xl font-black mt-1 tracking-tight">Ksh {stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`p-6 border-4 border-on-surface flex flex-col justify-between hover:-translate-y-0.5 transition-all
          ${isStockCritical 
            ? "bg-error-container text-error shadow-[4px_4px_0px_0px_var(--color-on-surface)]" 
            : "bg-surface text-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]"}`}
        >
          <div className="flex justify-between items-start">
            <AlertTriangle size={28} className={isStockCritical ? "text-error stroke-[2.5]" : "text-on-surface stroke-[2]"} />
            {isStockCritical ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-error text-error-container px-1.5 py-0.5 border border-error animate-pulse">Action Req.</span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider bg-green-500 text-white px-1.5 py-0.5 border border-on-surface">Nominal</span>
            )}
          </div>
          <div className="mt-6">
            <h3 className="font-extrabold text-xs uppercase tracking-wider opacity-80">Low Stock Alerts</h3>
            <p className="text-4xl font-black mt-1">{stats.lowStock}</p>
          </div>
        </div>
      </section>

      {/* Main Sections Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Orders Panel */}
        <div className="lg:col-span-2 bg-surface border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col">
          <div className="p-6 border-b-4 border-on-surface flex justify-between items-center bg-surface">
            <h2 className="font-headline-sm text-lg font-black uppercase tracking-wider">Recent Orders</h2>
            <Link 
              href="/merchant/orders" 
              className="flex items-center gap-1 text-xs font-black uppercase tracking-widest hover:underline text-primary-container"
            >
              <span>View All</span>
              <ArrowUpRight size={14} className="stroke-[3.5]" />
            </Link>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-on-surface text-surface uppercase text-[10px] tracking-widest font-black border-b-2 border-on-surface">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-on-surface/10 font-bold text-sm">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-on-surface/60 font-bold text-xs uppercase tracking-widest">
                      No orders received yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const statusClass = statusColors[order.status?.toLowerCase()] || "bg-surface-container text-on-surface border border-on-surface";
                    const orderDate = order.createdAt 
                      ? new Date((order.createdAt as { seconds?: number }).seconds! * 1000).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })
                      : "N/A";
                    return (
                      <tr key={order.id} className="hover:bg-on-surface/5 transition-colors">
                        <td className="p-4 font-mono text-xs">{order.id?.substring(0, 8)}...</td>
                        <td className="p-4">
                          <div className="font-black text-xs uppercase">{order.contactInformation?.fullName || "Guest Customer"}</div>
                          <div className="text-[10px] text-on-surface/60 font-medium normal-case">{order.contactInformation?.email || ""}</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 border-2 ${statusClass}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-medium text-on-surface/75">{orderDate}</td>
                        <td className="p-4 text-right font-black">
                          Ksh {order.totalAmount?.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning Panel */}
        <div className="bg-surface border-4 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex flex-col">
          <div className="p-6 border-b-4 border-on-surface flex items-center justify-between bg-surface">
            <h2 className="font-headline-sm text-lg font-black uppercase tracking-wider">Stock Alerts</h2>
            <Link 
              href="/merchant/products"
              className="text-xs font-black uppercase tracking-widest hover:underline text-primary-container flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowUpRight size={14} className="stroke-[3.5]" />
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[350px] space-y-4 font-bold">
            {lowStockProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center border-2 border-green-500">
                  <span className="text-green-600 dark:text-green-400 font-black text-xl">✓</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface">Inventory Healthy</h4>
                  <p className="text-[10px] text-on-surface/60 font-medium mt-0.5">All tracked products have sufficient stock levels.</p>
                </div>
              </div>
            ) : (
              lowStockProducts.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-3 border-2 border-on-surface bg-surface hover:bg-on-surface/5 transition-all shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                >
                  <div className="w-12 h-12 border-2 border-on-surface bg-surface-container shrink-0 overflow-hidden relative">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-on-surface/10 font-bold text-xs">IMG</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xs uppercase truncate text-on-surface">{item.name}</h4>
                    {item.variantName && (
                      <p className="text-[10px] font-bold text-secondary uppercase truncate mt-0.5">
                        Var: {item.variantName}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-error animate-pulse"></span>
                      <span className="text-[10px] font-black uppercase text-error">
                        {item.stock} left in stock
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
