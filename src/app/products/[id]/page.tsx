"use client";
import { useToast } from '@/components/providers/ToastProvider';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct } from '@/lib/api/products';
import { addToCart } from '@/lib/api/cart';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '@/lib/api/auth';
import { canAddToCartRole } from '@/lib/access';
import { addToWishlist, removeFromWishlist, isInWishlist } from '@/lib/api/wishlist';
import { Product } from '@/lib/data/products-data';
import Icon from '@/components/Icon';
import ProductReviews from '@/components/shop/ProductReviews';
import ProductRatingBadge from '@/components/shop/ProductRatingBadge';
import './detail.css';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';

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
  const { showToast } = useToast();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartStatus, setCartStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [userRole, setUserRole] = useState<'customer' | 'admin' | 'merchant' | 'guest'>('guest');

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
        setActiveImage(data.image_url || data.additional_images?.[0] || data.variants?.find((variant: any) => variant?.imageUrl)?.imageUrl || null);
        
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserRole(profile?.role || 'customer');
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserRole('customer');
        }
      } else {
        setUserRole('guest');
      }
    });

    return () => unsubscribe();
  }, []);

  // When a variant is selected, only show that variant's colors/sizes.
  // When no variant is selected, show all available colors/sizes from the product + all variants.
  const selectedVariant = (product?.hasVariants && product?.variants && selectedVariantIndex !== null)
    ? product.variants[selectedVariantIndex]
    : null;

  const parseCommaSeparated = (val: string | undefined): string[] => {
    if (!val) return [];
    return val.split(',').map(s => s.trim()).filter(Boolean);
  };

  const getVariantSizes = (variant: any) => {
    const variantSizes = parseCommaSeparated(variant?.size);
    return variantSizes.length > 0 ? variantSizes : (product?.sizes || []);
  };

  const getVariantPrice = (variant: any) => {
    const rawPrice = variant?.price;
    if (rawPrice === '' || rawPrice === null || rawPrice === undefined || Number(rawPrice) === 0) {
      return Number(product?.price || 0);
    }

    const variantPrice = Number(rawPrice);
    return Number.isFinite(variantPrice) ? variantPrice : Number(product?.price || 0);
  };

  const availableColors = selectedVariant
    ? parseCommaSeparated(selectedVariant.color)
    : Array.from(new Set([
        ...(product?.colors || []),
        ...(product?.variants || []).flatMap((v: any) => parseCommaSeparated(v.color))
      ]));

  const availableSizes = selectedVariant
    ? getVariantSizes(selectedVariant)
    : Array.from(new Set([
        ...(product?.sizes || []),
        ...(product?.variants || []).flatMap((v: any) => parseCommaSeparated(v.size))
      ]));

  const galleryEntries: [string, { src: string; label: string }][] = [];
  if (product?.image_url) {
    galleryEntries.push([product.image_url, { src: product.image_url, label: 'Main image' }]);
  }
  (product?.additional_images || []).filter(Boolean).forEach((src, index) => {
    galleryEntries.push([src, { src, label: `Gallery ${index + 1}` }]);
  });
  (product?.variants || [])
    .filter((variant: any) => variant?.imageUrl)
    .forEach((variant: any, index: number) => {
      galleryEntries.push([
        variant.imageUrl,
        { src: variant.imageUrl, label: variant.name || variant.color || variant.size || `Variant ${index + 1}` }
      ]);
    });
  const galleryItems = Array.from(new Map(galleryEntries).values());

  const handleAddToCart = async () => {
    if (!product) return;
    if (!canAddToCartRole(userRole)) return;

    if (availableColors.length > 0 && !selectedColor) {
      showToast("Please select a color.", 'warning');
      return;
    }
    
    if (availableSizes.length > 0 && !selectedSize) {
      showToast("Please select a size.", 'warning');
      return;
    }

    if (product.hasVariants && product.variants && product.variants.length > 0 && selectedVariantIndex === null) {
      showToast("Please select a specific variant.", 'warning');
      return;
    }

    setCartStatus('adding');
    try {
      await addToCart(
        product.id, 
        quantity, 
        selectedColor || undefined, 
        selectedSize || undefined, 
        selectedVariantIndex !== null ? selectedVariantIndex : undefined
      );
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
      <div className="max-w-[600px] mx-auto my-20 p-12 bg-surface border-2 border-on-surface text-center flex flex-col items-center justify-center">
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

  let currentStock = (product.trackInventory === false || product.stock === null) ? 99999 : (product.stock || 0);
  let basePrice = parseFloat(String(product.price || 0));

  if (product.hasVariants && product.variants && selectedVariantIndex !== null) {
    const matchingVariant = product.variants[selectedVariantIndex];
    if (matchingVariant) {
      basePrice = getVariantPrice(matchingVariant);
      currentStock = (product.trackInventory === false || matchingVariant.stock === null) ? 99999 : (matchingVariant.stock || 0);
    }
  }

  const discount = product.discount || 0;
  const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;

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
          <div className="relative bg-surface-container-low border-4 border-on-surface shadow-[6px_6px_0px_0px_var(--color-on-surface)] overflow-hidden flex items-center justify-center">
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
          {galleryItems.length > 0 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
              <button 
                onClick={() => setActiveImage(product.image_url || galleryItems[0]?.src || null)}
                className={`w-16 h-20 md:w-20 md:h-24 bg-surface-container-low border-2 overflow-hidden flex-shrink-0 active:scale-95 transition-all ${
                  activeImage === (product.image_url || galleryItems[0]?.src) ? 'border-primary-container' : 'border-on-surface'
                }`}
              >
                <img src={product.image_url || galleryItems[0]?.src || ''} alt="Base main" className="w-full h-auto object-contain" />
              </button>
              {galleryItems.filter(item => item.src !== (product.image_url || galleryItems[0]?.src)).map((item, idx) => (
                <button 
                  key={`${item.src}-${idx}`}
                  onClick={() => setActiveImage(item.src)}
                  className={`w-16 h-20 md:w-20 md:h-24 bg-surface-container-low border-2 overflow-hidden flex-shrink-0 active:scale-95 transition-all ${
                    activeImage === item.src ? 'border-primary-container' : 'border-on-surface'
                  }`}
                  title={item.label}
                >
                  <img src={item.src} alt={item.label} className="w-full h-auto object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Specifications & Configuration */}
        <div className="lg:col-span-6 space-y-8 bg-surface border-2 border-on-surface p-6 md:p-8 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          {/* Header */}
          <div className="border-b-2 border-surface-container pb-4 space-y-2">
            <span className="bg-surface-container text-on-surface border border-on-surface text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
              {product.category || 'Apparel'}
            </span>
            <h1 className="font-headline-md text-2xl md:text-3xl font-black uppercase tracking-tight text-on-surface">
              {product.name}
            </h1>

            {product.brand && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Brand: {product.brand}
              </p>
            )}
            
            <div className="flex items-center gap-3 pt-1">
              <span className="font-headline-md text-2xl font-black text-on-surface">{CURRENCY_CONFIG.symbol} {finalPrice.toFixed(2)}</span>
              {discount > 0 && (
                <span className="text-secondary line-through font-bold text-sm">{CURRENCY_CONFIG.symbol} {basePrice.toFixed(2)}</span>
              )}
              {currentStock > 0 && currentStock !== 99999 && (
                <span className="bg-surface-container text-on-surface border border-on-surface text-[10px] font-black uppercase px-2 py-0.5 tracking-wider ml-auto">
                  {currentStock} in stock
                </span>
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

          {/* Merchant Info */}
          <Link href={`/store/${product.merchantId || 'admin'}`} className="flex items-start gap-3 bg-surface-container-lowest p-3 border-2 border-on-surface-variant shadow-[2px_2px_0px_0px_rgba(26,28,28,0.2)] hover:border-primary-container transition-colors group block">
            <div className="w-10 h-10 bg-primary-container text-on-primary-container flex items-center justify-center font-black text-sm shrink-0 border-2 border-on-surface uppercase">
              {product.merchantName ? product.merchantName.substring(0,2) : 'JU'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-on-surface uppercase truncate tracking-wider flex items-center gap-1">
                {product.merchantName || 'JUJ4 Official Store'}
                {product.merchantStatus === 'verified' && (
                  <Icon name="verified" className="text-[14px] text-blue-500" />
                )}
              </p>
              <p className="text-[10px] text-secondary font-bold mt-0.5 leading-snug">
                {product.merchantInfo || 'Verified premium merchant with 100% positive feedback.'}
              </p>
            </div>
          </Link>

          {/* Option Settings */}
          <div className="space-y-4 border-t-2 border-surface-container pt-4">
            {/* Variants List */}
            {product.hasVariants && product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <label className="font-extrabold text-[10px] uppercase tracking-widest block text-secondary">
                  Select Variant: {selectedVariantIndex !== null ? <span className="text-on-surface font-black uppercase">{product.variants[selectedVariantIndex]?.name || product.variants[selectedVariantIndex]?.color || product.variants[selectedVariantIndex]?.size || `Option ${selectedVariantIndex + 1}`}</span> : <span className="text-error font-black uppercase">Required</span>}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.variants.map((v: any, idx: number) => {
                    const priceStr = getVariantPrice(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                    const variantSizes = getVariantSizes(v);
                    const isSelected = selectedVariantIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedVariantIndex(idx);
                          setSelectedColor(null);
                          setSelectedSize(null);
                          if (v.imageUrl) setActiveImage(v.imageUrl);
                          // Auto-select color/size if the variant only has one option
                          const parsedColors = parseCommaSeparated(v.color);
                          if (parsedColors.length === 1) setSelectedColor(parsedColors[0]);
                          const parsedSizes = getVariantSizes(v);
                          if (parsedSizes.length === 1) setSelectedSize(parsedSizes[0]);
                        }}
                        className={`text-left p-2.5 border-2 text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                          isSelected 
                            ? 'bg-primary-container text-on-primary-container border-on-surface' 
                            : 'bg-surface text-on-surface border-surface-dim hover:border-on-surface hover:bg-surface-container'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {v.imageUrl && (
                            <img src={v.imageUrl} alt={`${v.color || ''} ${v.size || ''}`} className="w-16 h-16 object-cover border-2 border-on-surface shrink-0" />
                          )}
                          <span className="truncate uppercase">
                            {[v.name, v.color, variantSizes.join(', ')].filter(Boolean).join(' • ') || `Option ${idx + 1}`}
                          </span>
                        </div>
                        <span className="font-black shrink-0">{CURRENCY_CONFIG.symbol} {priceStr}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Colors */}
            {availableColors.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="font-extrabold text-[10px] uppercase tracking-widest block text-secondary">
                  Select Color: {selectedColor ? <span className="text-on-surface font-black uppercase">{selectedColor}</span> : <span className="text-error font-black uppercase">Required</span>}
                </label>
                <div className="flex gap-2">
                  {availableColors.map(color => (
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
            {availableSizes.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="font-extrabold text-[10px] uppercase tracking-widest block text-secondary">
                  Select Size: {selectedSize ? <span className="text-on-surface font-black">{selectedSize}</span> : <span className="text-error font-black uppercase">Required</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border-2 text-xs font-extrabold uppercase transition-all ${
                        size === selectedSize 
                          ? 'bg-primary-container text-on-primary-container border-on-surface' 
                          : 'bg-surface text-on-surface border-on-surface hover:bg-surface-container'
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
              {product.allowMultiplePurchases !== false && (
                <div className="space-y-1.5">
                  <label className="font-extrabold text-[10px] uppercase tracking-widest block text-secondary">Qty</label>
                  <div className="flex border-2 border-on-surface bg-surface w-32">
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
                      onClick={() => setQuantity(q => Math.min(currentStock, q + 1))}
                      className="px-3 py-2 font-bold hover:bg-surface-container active:bg-surface-dim transition-colors border-l-2 border-on-surface text-sm flex-1"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Add Button */}
              <div className="flex-1 w-full pt-5 flex gap-2">
                {canAddToCartRole(userRole) && (
                  <button
                    onClick={handleAddToCart}
                    disabled={cartStatus === 'adding'}
                    className={`flex-1 h-12 bg-primary-container text-on-primary-container font-headline-md font-bold uppercase tracking-wider text-xs border-2 border-on-surface transition-transform active:scale-95 shadow-[4px_4px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2 ${
                      cartStatus === 'added' ? '!bg-green-600 !text-white' : ''
                    }`}
                  >
                    <Icon name={cartStatus === 'added' ? 'check' : 'shopping_cart'} className="text-sm font-black" />
                    <span>
                      {cartStatus === 'adding' ? 'Adding to Cart...' : cartStatus === 'added' ? 'Added successfully ✓' : cartStatus === 'error' ? 'Pipeline error' : 'Add to Shopping Cart'}
                    </span>
                  </button>
                )}
                <button
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className={`w-12 h-12 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] flex items-center justify-center hover:bg-surface-container active:scale-95 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--color-on-surface)] transition-all ${isWishlisted ? 'text-error' : 'text-on-surface'}`}
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
