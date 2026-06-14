import Link from 'next/link';

const sections = [
  {
    title: '1. Information We Collect',
    icon: 'database',
    content: [
      {
        subtitle: 'Personal Information',
        text: 'When you create an account, place an order, or contact us, we may collect your name, email address, phone number, shipping address, billing address, and payment information.',
      },
      {
        subtitle: 'Account Data',
        text: 'If you register for an account, we store your login credentials (email and encrypted password), order history, wishlist items, and preferences.',
      },
      {
        subtitle: 'Automatically Collected Data',
        text: 'We automatically collect certain information when you visit our site, including your IP address, browser type, device information, pages visited, and referring URLs. We use analytics services to help us understand how our site is used.',
      },
    ],
  },
  {
    title: '2. How We Use Your Information',
    icon: 'settings',
    content: [
      {
        subtitle: '',
        text: 'We use the information we collect to: process and fulfil your orders; manage your account and provide customer support; send transactional emails (order confirmations, shipping updates); personalise your shopping experience and recommend products; improve our website, products, and services; detect and prevent fraud or unauthorised activity; comply with legal obligations.',
      },
    ],
  },
  {
    title: '3. Data Security',
    icon: 'shield',
    content: [
      {
        subtitle: '',
        text: 'We implement industry-standard security measures to protect your personal information, including SSL encryption for all data transmissions, secure payment processing through trusted third-party providers, regular security audits and vulnerability assessments, and restricted access to personal data on a need-to-know basis. While we take every reasonable precaution, no method of internet transmission or electronic storage is 100% secure.',
      },
    ],
  },
  {
    title: '4. Cookies & Tracking',
    icon: 'cookie',
    content: [
      {
        subtitle: 'Essential Cookies',
        text: 'Required for the website to function properly. These include session cookies, authentication tokens, and shopping cart data.',
      },
      {
        subtitle: 'Analytics Cookies',
        text: 'Help us understand how visitors interact with our site. We use Firebase Analytics and similar tools to collect aggregated, anonymised usage data.',
      },
      {
        subtitle: 'Managing Cookies',
        text: 'You can control cookies through your browser settings. Disabling certain cookies may limit your ability to use some features of our site.',
      },
    ],
  },
  {
    title: '5. Third-Party Services',
    icon: 'handshake',
    content: [
      {
        subtitle: '',
        text: 'We may share your information with trusted third parties who assist us in operating our website, processing payments, delivering orders, and analysing site usage. These include payment processors (for secure transaction handling), shipping and logistics partners, cloud hosting and infrastructure providers (Firebase/Google Cloud), and email service providers for transactional communications. We do not sell, rent, or trade your personal information to third parties for their marketing purposes.',
      },
    ],
  },
  {
    title: '6. Your Rights',
    icon: 'gavel',
    content: [
      {
        subtitle: '',
        text: 'You have the right to: access the personal data we hold about you; request correction of inaccurate information; request deletion of your account and personal data; opt out of marketing communications at any time; request a portable copy of your data. To exercise any of these rights, please contact us at support@juj4.com.',
      },
    ],
  },
  {
    title: '7. Contact Us',
    icon: 'mail',
    content: [
      {
        subtitle: '',
        text: 'If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at: Email: support@juj4.com. We will respond to your inquiry within 48 business hours.',
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4 md:px-16">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-8">
          <Link href="/" className="text-secondary hover:text-primary-container transition-colors">
            Home
          </Link>
          <span className="text-secondary">/</span>
          <span className="text-on-surface">Privacy Policy</span>
        </nav>

        {/* Page Header */}
        <div className="bg-[#1a1c1c] text-white p-8 md:p-12 border-2 border-[#1a1c1c] mb-8">
          <span className="inline-block bg-primary-container text-on-primary-container font-extrabold text-xs px-3 py-1 mb-4 uppercase tracking-widest">
            Legal
          </span>
          <h1 className="font-headline-md text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="font-body-md text-sm text-gray-300 leading-relaxed max-w-2xl">
            Your privacy matters to us. This policy explains how JUJ4 collects, uses, and protects your personal information when you use our platform.
          </p>
          <p className="font-body-md text-xs text-gray-400 mt-4 uppercase tracking-wider font-bold">
            Last Updated: May 31, 2026
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <section
              key={index}
              className="bg-surface border-2 border-on-surface p-6 md:p-8 shadow-[4px_4px_0px_0px_var(--color-on-surface)]"
            >
              <h2 className="font-headline-md text-lg md:text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 bg-primary-container text-on-primary-container border-2 border-on-background text-lg">
                  <span className="material-symbols-outlined text-xl">{section.icon}</span>
                </span>
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.content.map((item, idx) => (
                  <div key={idx}>
                    {item.subtitle && (
                      <h3 className="font-bold text-sm uppercase tracking-wider text-on-surface mb-1">
                        {item.subtitle}
                      </h3>
                    )}
                    <p className="font-body-md text-sm text-secondary leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-6 bg-surface-container border-2 border-on-surface text-center">
          <p className="font-body-md text-xs text-secondary uppercase tracking-wider font-bold">
            By using JUJ4, you agree to this Privacy Policy.
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <Link
              href="/terms"
              className="text-xs font-bold uppercase tracking-wider text-on-background hover:text-primary-container underline transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/returns"
              className="text-xs font-bold uppercase tracking-wider text-on-background hover:text-primary-container underline transition-colors"
            >
              Returns Policy
            </Link>
            <Link
              href="/contact"
              className="text-xs font-bold uppercase tracking-wider text-on-background hover:text-primary-container underline transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
