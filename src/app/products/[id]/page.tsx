'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct } from '@/lib/api/products';
import { addToCart } from '@/lib/api/cart';
import { addToWishlist, removeFromWishlist, isInWishlist } from '@/lib/api/wishlist';
import { Product } from '@/lib/data/products-data';
import Icon from '@/components/Icon';
import ProductReviews from '@/components/shop/ProductReviews';
import ProductRatingBadge from '@/components/shop/ProductRatingBadge';
import './detail.css';

const mapColorToCss = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('black')) return '#1a1c1c';
  if (lower.includes('white')) return '#ffffff';
  if (lower.includes('red')) return '#ff6b00';
  if (lower.includes('blue')) return '#00658f';
  if (lower.includes('green')) return '#ffdcc3';
  if (lower.includes('orange')) return '#ff8c00';
  if (lower.includes('gray') || lower.includes('grey') || lower.includes('silver')) return '#c6c6c6';
  return '#ff8c00';
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartStatus, setCartStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) {
        setError(true);
        setLoading(false);
        return;
      }
      try {
        const data = await getProduct(productId);
        setProduct(data);
        setActiveImage(data.image_url);
        if (data.colors && data.colors.length > 0) setSelectedColor(data.colors[0]);
        if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[0]);
        
        const wishlisted = await isInWishlist(productId);
        setIsWishlisted(wishlisted);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;
    setCartStatus('adding');
    try {
      await addToCart(product.id, quantity);
      setCartStatus('added');
      setTimeout(() => setCartStatus('idle'), 2000);
    } catch (err: any) {
      setCartStatus('error');
      setTimeout(() => setCartStatus('idle'), 2000);
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await removeFromWishlist(product.id);
        setIsWishlisted(false);
      } else {
        await addToWishlist(product.id);
        setIsWishlisted(true);
      }
    } catch (err) {
      console.error('Wishlist error:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 flex-grow">
        <Icon name="sync" className="text-4xl animate-spin text-primary-container" />
        <p className="mt-4 font-bold text-xs tracking-widest text-secondary uppercase">Loading product specifications...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[600px] mx-auto my-20 p-12 bg-white border-2 border-on-surface text-center flex flex-col items-center justify-center">
        <Icon name="error" className="text-5xl mb-4 text-error" />
        <h3 className="font-headline-md text-xl font-bold uppercase mb-2">Product Not Found</h3>
        <p className="text-sm text-secondary mb-6 max-w-[320px]">We couldn't retrieve the specified catalog items. They may have been deregistered by an administrator.</p>
        <Link 
          href="/products" 
          className="px-6 py-3 bg-primary-container text-on-primary-container font-bold text-xs uppercase tracking-wider border-2 border-on-surface shadow-sm active:scale-95 transition-transform"
        >
          Back to Catalog
        </Link>
      </div>
    );
  }

  const discount = product.discount || 0;
  const originalPrice = parseFloat(String(product.price));
  const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-8">
      
      {/* Breadcrumb Navigation */}
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-on-surface">Shop</Link>
        <span>/</span>
        <span className="text-on-surface truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main Details Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Picture Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative bg-surface-container-low border-4 border-on-surface shadow-[6px_6px_0px_0px_rgba(26,28,28,1)] overflow-hidden flex items-center justify-center">
            <img 
              src={activeImage || product.image_url} 
              alt={product.name} 
              className="w-full h-auto object-contain"
            />
            {product.tags && product.tags.length > 0 && (
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag} className="bg-primary-container text-on-primary-container text-[9px] font-black uppercase px-2 py-0.5 border border-on-surface shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {discount > 0 && (
              <span className="absolute top-4 right-4 bg-red-50 text-error border-2 border-error text-[10px] font-black uppercase px-2.5 py-1">
                -{discount}% OFF
              </span>
            )}
          </div>

          {/* Additional Images Roll */}
          {product.additional_images && product.additional_images.length > 0 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
              <button 
                onClick={() => setActiveImage(product.image_url)}
                className={`w-16 h-20 md:w-20 md:h-24 bg-surface-container-low border-2 overflow-hidden flex-shrink-0 active:scale-95 transition-all ${
                  activeImage === product.image_url ? 'border-primary-container' : 'border-on-surface'
                }`}
              >
                <img src={product.image_url} alt="Base main" className="w-full h-auto object-contain" />
              </button>
              {product.additional_images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-20 md:w-20 md:h-24 bg-surface-container-low border-2 overflow-hidden flex-shrink-0 active:scale-95 transition-all ${
                    activeImage === img ? 'border-primary-container' : 'border-on-surface'
                  }`}
                >
                  <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-auto object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Specifications & Configuration */}
        <div className="lg:col-span-6 space-y-8 bg-white border-2 border-on-surface p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(26,28,28,1)]">
          {/* Header */}
          <div className="border-b-2 border-surface-container pb-4 space-y-2">
            <span className="bg-surface-container text-on-surface border border-on-surface text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
              {product.category || 'Apparel'}
            </span>
            <h1 className="font-headline-md text-2xl md:text-3xl font-black uppercase tracking-tight text-on-surface">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-3 pt-1">
              <span className="font-headline-md text-2xl font-black text-on-surface">Kes. {finalPrice.toFixed(2)}</span>
              {discount > 0 && (
                <span className="text-sm font-bold text-secondary line-through">Kes. {originalPrice.toFixed(2)}</span>
              )}
              <ProductRatingBadge productId={product.id} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-headline-md text-xs font-black uppercase tracking-widest text-on-surface">Product Specifications</h3>
            <p className="font-body-md text-xs text-secondary leading-relaxed font-semibold">
              {product.description || 'Premium engineered sports apparel curated utilizing extreme-velocity structural textures, optimized for peak retail execution.'}
            </p>
          </div>

          {/* Option Settings */}
          <div className="space-y-4 border-t-2 border-surface-container pt-4">
            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-2">
                <label className="font-extrabold text-[10px] uppercase tracking-widest block text-secondary">
                  Select Color: <span className="text-on-surface font-black uppercase">{selectedColor}</span>
                </label>
                <div className="flex gap-2">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: mapColorToCss(color) }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${
                        color === selectedColor ? 'border-primary-container scale-105 shadow-sm' : 'border-on-surface'
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="font-extrabold text-[10px] uppercase tracking-widest block text-secondary">
                  Select Size: <span className="text-on-surface font-black">{selectedSize}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border-2 text-xs font-extrabold uppercase transition-all ${
                        size === selectedSize 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'bg-white text-on-surface border-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cart Quantity Adjustments & Primary Call-to-Action */}
          <div className="space-y-4 border-t-2 border-surface-container pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Quantity Box */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-[10px] uppercase tracking-widest block text-secondary">Qty</label>
                <div className="flex border-2 border-on-surface bg-white w-32">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-3 py-2 font-bold hover:bg-surface-container active:bg-surface-dim transition-colors border-r-2 border-on-surface text-sm flex-1"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 font-extrabold flex items-center justify-center text-sm min-w-[40px]">
                    {quantity}
                  </span>
                  <button 
                    onClick={() => setQuantity(q => Math.min(10, q + 1))}
                    className="px-3 py-2 font-bold hover:bg-surface-container active:bg-surface-dim transition-colors border-l-2 border-on-surface text-sm flex-1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add Button */}
              <div className="flex-1 w-full pt-5 flex gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={cartStatus === 'adding'}
                  className={`flex-1 h-12 bg-primary-container text-on-primary-container font-headline-md font-bold uppercase tracking-wider text-xs border-2 border-on-surface transition-transform active:scale-95 shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(26,28,28,1)] hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2 ${
                    cartStatus === 'added' ? '!bg-green-600 !text-white' : ''
                  }`}
                >
                  <Icon name={cartStatus === 'added' ? 'check' : 'shopping_cart'} className="text-sm font-black" />
                  <span>
                    {cartStatus === 'adding' ? 'Adding to Cart...' : cartStatus === 'added' ? 'Added successfully ✓' : cartStatus === 'error' ? 'Pipeline error' : 'Add to Shopping Cart'}
                  </span>
                </button>
                <button
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className={`w-12 h-12 bg-white border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(26,28,28,1)] flex items-center justify-center hover:bg-surface-container active:scale-95 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(26,28,28,1)] transition-all ${isWishlisted ? 'text-error' : 'text-on-surface'}`}
                  title="Toggle Wishlist"
                >
                  <Icon name={isWishlisted ? 'favorite' : 'favorite_border'} className="text-xl" />
                </button>
              </div>
            </div>

            <div className="pt-2 text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-1.5">
              <Icon name="verified" className="text-xs font-black" />
              <span>In Stock and Ready for Express Delivery</span>
            </div>
          </div>

          {/* Delivery & Return Policies Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-surface-container pt-6">
            <div className="flex gap-3 items-start p-3 bg-surface border border-on-surface-variant">
              <Icon name="local_shipping" className="text-primary-container text-2xl font-bold" />
              <div>
                <h4 className="font-extrabold text-[10px] uppercase text-on-surface">Free Delivery</h4>
                <p className="text-[9px] text-secondary font-semibold uppercase mt-0.5">Complimentary for orders over Kes. 150</p>
              </div>
            </div>
            <div className="flex gap-3 items-start p-3 bg-surface border border-on-surface-variant">
              <Icon name="swap_horiz" className="text-primary-container text-2xl font-bold" />
              <div>
                <h4 className="font-extrabold text-[10px] uppercase text-on-surface">30 Days Return</h4>
                <p className="text-[9px] text-secondary font-semibold uppercase mt-0.5">Hassle-free operations guarantee</p>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* Reviews Section */}
      <section className="border-t-4 border-on-surface pt-12 mt-12">
        <ProductReviews productId={productId} />
      </section>

    </main>
  );
}
