'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProducts } from '@/lib/api/products';
import { getUserProfile, User } from '@/lib/api/auth';
import { Product } from '@/lib/data/products-data';
import Icon from '@/components/Icon';
import ProductRatingBadge from '@/components/shop/ProductRatingBadge';

export default function MerchantStorePage() {
  const params = useParams();
  const merchantId = params.merchantId as string;

  const [merchant, setMerchant] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantLoading, setMerchantLoading] = useState(true);

  useEffect(() => {
    const fetchMerchantAndProducts = async () => {
      try {
        if (merchantId !== 'admin') {
          const profile = await getUserProfile(merchantId);
          setMerchant(profile);
        } else {
          setMerchant({
            uid: 'admin',
            email: 'admin@juj4.com',
            role: 'admin',
            storeName: 'JUJ4 Official Store',
            businessCategory: 'Retail',
            location: 'Global',
          });
        }
      } catch (error) {
        console.error('Error fetching merchant profile:', error);
      } finally {
        setMerchantLoading(false);
      }

      try {
        const data = await getProducts({ merchantId });
        setProducts(data);
      } catch (error) {
        console.error('Error fetching merchant products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (merchantId) {
      fetchMerchantAndProducts();
    }
  }, [merchantId]);

  if (merchantLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 flex-grow bg-background">
        <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
        <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Merchant Profile...</p>
      </div>
    );
  }

  const storeName = merchant?.storeName || (merchant?.first_name ? `${merchant.first_name} ${merchant.last_name || ''}` : 'Unknown Merchant');

  return (
    <div className="bg-background flex-grow flex flex-col">
      {/* Merchant Header Hero */}
      <section className="bg-on-surface text-surface py-12 md:py-20 border-b-4 border-primary-container relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-32 h-32 border-2 border-primary-container/30 rotate-45 animate-pulse" />
          <div className="absolute bottom-[10%] right-[10%] w-48 h-48 border-2 border-white/20 rotate-12" />
        </div>
        
        <div className="max-w-[1440px] mx-auto px-6 md:px-16 relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-primary-container text-on-primary-container flex items-center justify-center font-black text-5xl md:text-6xl uppercase border-4 border-surface shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] shrink-0">
            {storeName.substring(0, 2)}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="font-headline-lg text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">
              {storeName}
            </h1>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm font-bold text-surface-dim mb-4">
              {merchant?.businessCategory && (
                <span className="flex items-center gap-1 bg-white/10 px-3 py-1 uppercase tracking-wider">
                  <Icon name="store" className="text-[14px]" /> {merchant.businessCategory}
                </span>
              )}
              {merchant?.location && (
                <span className="flex items-center gap-1 bg-white/10 px-3 py-1 uppercase tracking-wider">
                  <Icon name="location_on" className="text-[14px]" /> {merchant.location}
                </span>
              )}
              {merchant?.merchantStatus === 'verified' && (
                <span className="flex items-center gap-1 bg-white/10 px-3 py-1 uppercase tracking-wider text-primary-container">
                  <Icon name="verified" className="text-[14px]" /> Verified Seller
                </span>
              )}
            </div>
            <p className="text-sm max-w-2xl text-surface/80 leading-relaxed font-medium">
              Welcome to the official storefront for {storeName}. Browse our entire catalog of premium items below.
            </p>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section className="max-w-[1440px] w-full mx-auto px-6 md:px-16 py-12 md:py-16">
        <div className="flex items-center justify-between mb-8 border-b-2 border-on-surface pb-4">
          <h2 className="font-headline-md text-2xl md:text-3xl font-black uppercase tracking-tight text-on-surface">
            Merchant Catalog
          </h2>
          <span className="font-bold text-xs uppercase tracking-wider text-secondary bg-surface-container-low px-3 py-1 rounded">
            {loading ? '...' : `${products.length} Items`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-on-surface">
            <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
            <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading Catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,28,1)]">
            <Icon name="inventory_2" className="text-5xl text-secondary mb-4" />
            <h4 className="font-extrabold uppercase text-lg text-on-surface">No Products Available</h4>
            <p className="text-sm text-secondary mt-2 max-w-[320px]">This merchant hasn't listed any products yet or they are currently out of stock.</p>
            <Link href="/products" className="mt-6 px-6 py-3 bg-on-surface text-surface font-bold uppercase text-xs tracking-widest border-2 border-on-surface hover:bg-surface-dim transition-colors">
              Browse Other Stores
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const discount = product.discount || 0;
              const originalPrice = parseFloat(String(product.price));
              const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

              return (
                <article 
                  key={product.id} 
                  className="bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(26,28,28,1)] transition-all flex flex-col relative group"
                >
                  <Link href={`/products/${product.id}`} className="block relative bg-surface-container-low aspect-square border-b-2 border-on-surface overflow-hidden">
                    <img 
                      src={product.image_url || 'https://via.placeholder.com/300'} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {discount > 0 && (
                      <span className="absolute top-3 right-3 bg-error text-white text-[10px] font-black px-2.5 py-1 uppercase shadow-sm border border-on-surface">
                        -{discount}% OFF
                      </span>
                    )}
                  </Link>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-primary-container font-extrabold text-xl mb-1">
                      KSh {finalPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    
                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-bold text-sm text-on-surface line-clamp-2 mb-2 hover:underline">{product.name}</h3>
                    </Link>
                    
                    <div className="mt-auto pt-4 border-t border-surface-container flex items-center justify-between">
                      <ProductRatingBadge productId={product.id} />
                      <Link href={`/products/${product.id}`} className="text-[10px] font-black uppercase tracking-widest text-secondary hover:text-primary-container flex items-center gap-1">
                        View <Icon name="arrow_forward" className="text-[12px]" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
