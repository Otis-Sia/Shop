import Link from 'next/link';
import Icon from '@/components/Icon';
import { STORE_CONFIG } from '@/lib/config/store';

export default function CookiePolicyPage() {
  const sections = [
    {
      num: "1",
      title: "Introduction",
      icon: "info",
      content: (
        <p>
          <strong>Cepine Juj4</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) uses cookies and similar tracking technologies on <Link href="https://juj4.cepine.com" className="underline font-bold text-on-surface hover:text-primary-container">https://juj4.cepine.com</Link> (the &ldquo;Website&rdquo;). This Cookie Policy explains what cookies are, how we use them, and how you can control them. This policy is compliant with the <strong>Kenyan Data Protection Act, 2019</strong>, the EU ePrivacy Directive, and the GDPR where applicable.
        </p>
      ),
    },
    {
      num: "2",
      title: "What Are Cookies?",
      icon: "cookie",
      content: (
        <div className="space-y-3">
          <p>
            Cookies are small text files placed on your device (computer, smartphone, tablet) when you visit a website. They are widely used to make websites work more efficiently and to provide information to site operators.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>First-party cookies:</strong> set directly by our website.</li>
            <li><strong>Third-party cookies:</strong> set by a domain other than our website (e.g., Firebase Analytics, Google services).</li>
            <li><strong>Session cookies:</strong> temporary cookies deleted automatically when you close your browser.</li>
            <li><strong>Persistent cookies:</strong> remain on your device until they expire or are manually cleared.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "3",
      title: "Types of Cookies We Use",
      icon: "category",
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-surface-container">
            <thead className="bg-surface-container font-bold text-on-surface uppercase">
              <tr>
                <th className="p-2 border border-surface-container">Category</th>
                <th className="p-2 border border-surface-container">Purpose</th>
                <th className="p-2 border border-surface-container">Consent Required?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">Strictly Necessary</td>
                <td className="p-2 border border-surface-container">Essential for website operation, e.g. keeping you logged in, shopping cart persistence, secure checkout sessions.</td>
                <td className="p-2 border border-surface-container font-bold text-secondary">No (Exempt)</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">Preferences</td>
                <td className="p-2 border border-surface-container">Remember user choices such as theme preferences, currency selection, and regional settings.</td>
                <td className="p-2 border border-surface-container font-bold text-primary-container">Yes</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">Analytics & Performance</td>
                <td className="p-2 border border-surface-container">Help us understand how visitors interact with the site, pages visited, errors, and load speed.</td>
                <td className="p-2 border border-surface-container font-bold text-primary-container">Yes</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">Advertising & Marketing</td>
                <td className="p-2 border border-surface-container">Measure campaign effectiveness and display relevant promotions where applicable.</td>
                <td className="p-2 border border-surface-container font-bold text-primary-container">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      num: "4",
      title: "Specific Cookies Used on Our Website",
      icon: "tune",
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-surface-container">
            <thead className="bg-surface-container font-bold text-on-surface uppercase">
              <tr>
                <th className="p-2 border border-surface-container">Cookie Name</th>
                <th className="p-2 border border-surface-container">Provider</th>
                <th className="p-2 border border-surface-container">Type</th>
                <th className="p-2 border border-surface-container">Purpose</th>
                <th className="p-2 border border-surface-container">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">sb-auth-token / session</td>
                <td className="p-2 border border-surface-container">{STORE_CONFIG.name}</td>
                <td className="p-2 border border-surface-container">Strictly Necessary</td>
                <td className="p-2 border border-surface-container">Maintains user session and authenticated state</td>
                <td className="p-2 border border-surface-container">Session / 30 Days</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">juj4_cart</td>
                <td className="p-2 border border-surface-container">{STORE_CONFIG.name}</td>
                <td className="p-2 border border-surface-container">Strictly Necessary</td>
                <td className="p-2 border border-surface-container">Remembers items stored in active shopping cart</td>
                <td className="p-2 border border-surface-container">30 Days</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">cookie_consent</td>
                <td className="p-2 border border-surface-container">{STORE_CONFIG.name}</td>
                <td className="p-2 border border-surface-container">Preferences</td>
                <td className="p-2 border border-surface-container">Stores cookie banner acknowledgement</td>
                <td className="p-2 border border-surface-container">1 Year</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-on-surface border border-surface-container">_ga / _ga_*</td>
                <td className="p-2 border border-surface-container">Google / Firebase</td>
                <td className="p-2 border border-surface-container">Analytics</td>
                <td className="p-2 border border-surface-container">Anonymized website usage statistics</td>
                <td className="p-2 border border-surface-container">2 Years</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      num: "5",
      title: "How We Use Cookies",
      icon: "settings_suggest",
      content: (
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Enable core website functions including cart checkout, user login, and navigation;</li>
          <li>Store your display preferences;</li>
          <li>Monitor site performance, page load times, and error telemetry;</li>
          <li>Protect against fraudulent traffic and unauthorized access.</li>
        </ul>
      ),
    },
    {
      num: "6",
      title: "Third-Party Cookies",
      icon: "public",
      content: (
        <p>
          Certain third-party integrations (such as analytics or secure payment gateways) may set cookies on your browser. We do not directly control third-party cookies; you can review the privacy policies of Google Firebase and our respective payment gateways for further details.
        </p>
      ),
    },
    {
      num: "7",
      title: "Cookie Consent and Browser Controls",
      icon: "manage_accounts",
      content: (
        <div className="space-y-3">
          <p>
            You can configure your browser to block, delete, or alert you to cookies. Disabling strictly necessary cookies may impact essential checkout features.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Cookies and other site data</li>
            <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data</li>
            <li><strong>Apple Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data</li>
            <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions</li>
          </ul>
        </div>
      ),
    },
    {
      num: "8",
      title: "Do Not Track (DNT) Signals",
      icon: "do_not_disturb",
      content: (
        <p>
          Some browsers offer a &ldquo;Do Not Track&rdquo; (DNT) signal. Because no uniform technical standard currently exists across the industry, we do not respond directly to automated DNT headers, but you can control cookie storage via your browser settings.
        </p>
      ),
    },
    {
      num: "9",
      title: "Changes to This Cookie Policy",
      icon: "update",
      content: (
        <p>
          We may update this Cookie Policy periodically to reflect technological or regulatory changes. The latest version with the &ldquo;Last Updated&rdquo; date will always be available on this page.
        </p>
      ),
    },
    {
      num: "10",
      title: "Contact Information",
      icon: "contacts",
      content: (
        <div className="space-y-1 pl-2">
          <p><strong>Email:</strong> <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a></p>
          <p><strong>Phone:</strong> <a href={`tel:${STORE_CONFIG.phone}`} className="underline font-bold">{STORE_CONFIG.phone}</a></p>
          <p><strong>Address:</strong> {STORE_CONFIG.address}</p>
        </div>
      ),
    },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-12">
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <span className="text-on-surface">Cookie Policy</span>
      </nav>

      <section className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="inline-block bg-primary-container text-on-primary-container font-extrabold text-xs px-3 py-1 uppercase tracking-widest border border-on-surface">
            Tracking &amp; Privacy
          </span>
          <h1 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tight text-on-surface">
            Cookie Policy
          </h1>
          <p className="font-extrabold text-xs uppercase tracking-wider text-secondary">
            Last Updated: September 2026
          </p>
        </div>

        <div className="bg-surface border-2 border-on-surface p-8 md:p-12 shadow-[8px_8px_0px_0px_var(--color-on-surface)] space-y-10">
          {sections.map((section) => (
            <div key={section.num} className="space-y-4">
              <h2 className="font-headline-md text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
                <Icon name={section.icon} className="text-primary-container" />
                {section.num}. {section.title}
              </h2>
              <div className="font-body-md text-sm text-secondary font-medium leading-relaxed">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links Footer Note */}
        <div className="p-6 bg-surface-container border-2 border-on-surface text-center space-y-3 shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
          <p className="font-body-md text-xs text-secondary uppercase tracking-wider font-bold">
            Explore our related legal policies
          </p>
          <div className="flex justify-center gap-6">
            <Link
              href="/privacy"
              className="text-xs font-bold uppercase tracking-wider text-on-background hover:text-primary-container underline transition-colors"
            >
              Privacy Policy
            </Link>
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
          </div>
        </div>
      </section>
    </main>
  );
}
