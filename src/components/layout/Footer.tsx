export default function Footer() {
  return (
    <footer className="bg-[#1a1c1c] text-white border-t-4 border-[#ff8c00] py-16 px-6 md:px-16 mt-auto">
      <div className="w-full flex flex-col md:flex-row justify-between items-start text-left max-w-[1440px] mx-auto gap-12">
        <div className="mb-6 md:mb-0 max-w-sm space-y-4">
          <div className="font-headline-md text-3xl font-black text-[#f9f9f9] tracking-tighter uppercase">
            JUJ4
          </div>
          <p className="text-xs font-semibold text-[#e2e2e2] leading-relaxed">
            Premium engineered sports apparel curated utilizing extreme-velocity structural textures, optimized for peak retail execution.
          </p>
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest pt-4">
            &copy; {new Date().getFullYear()} JUJ4 E-COMMERCE INC.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16">
          <div className="flex flex-col gap-3">
            <h4 className="font-headline-md text-xs font-black uppercase tracking-widest text-[#ff8c00] mb-2">Shop</h4>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/products">All Products</a>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/products?category=Fashion">New Arrivals</a>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/wishlist">My Wishlist</a>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-headline-md text-xs font-black uppercase tracking-widest text-[#ff8c00] mb-2">Support</h4>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/contact">Contact Us</a>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/returns">Returns & Refunds</a>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/orders">Order Tracking</a>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-headline-md text-xs font-black uppercase tracking-widest text-[#ff8c00] mb-2">Legal</h4>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/privacy">Privacy Policy</a>
            <a className="text-[#e2e2e2] text-xs font-medium hover:text-[#ffb77d] hover:translate-x-1 transition-all" href="/terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

