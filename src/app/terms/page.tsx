import Link from 'next/link';
import Icon from '@/components/Icon';

export default function TermsOfServicePage() {
  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-12">
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <span className="text-on-surface">Terms of Service</span>
      </nav>

      <section className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="font-headline-md text-4xl md:text-5xl font-black uppercase tracking-tight text-on-surface">Terms of Service</h1>
          <p className="font-extrabold text-xs uppercase tracking-wider text-secondary">Last Updated: October 2024</p>
        </div>

        <div className="bg-white border-2 border-on-surface p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(26,28,28,1)] space-y-10">
          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="description" className="text-primary-container" />
              1. Acceptance of Terms
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              By accessing and using JUJ4's website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="account_circle" className="text-primary-container" />
              2. Account Responsibilities
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="payments" className="text-primary-container" />
              3. Products & Pricing
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              All prices are displayed in Kenyan Shillings (Kes.) unless otherwise noted. We reserve the right to modify prices, products, and services without prior notice. We make every effort to display product colors and images accurately.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="local_shipping" className="text-primary-container" />
              4. Orders, Shipping & Delivery
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              We reserve the right to refuse or cancel any order. Shipping times are estimates and not guaranteed. The risk of loss passes to you upon our delivery to the carrier.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="gavel" className="text-primary-container" />
              5. Intellectual Property
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              All content on this site, including text, graphics, logos, images, and software, is the property of JUJ4 and protected by international copyright laws.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="warning" className="text-primary-container" />
              6. Limitation of Liability
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              JUJ4 shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services or products.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
