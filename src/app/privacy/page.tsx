import Link from 'next/link';
import Icon from '@/components/Icon';
import { STORE_CONFIG } from '@/lib/config/store';

export default function PrivacyPolicyPage() {
  const sections = [
    {
      num: "1",
      title: "Introduction",
      icon: "info",
      content: (
        <div className="space-y-3">
          <p>
            <strong>Cepine Juj4</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting your personal data and respecting your privacy. This Privacy Policy explains how we collect, use, share, retain, and protect personal information when you visit <Link href="https://juj4.cepine.com" className="underline font-bold text-on-surface hover:text-primary-container">https://juj4.cepine.com</Link>, create an account, make a purchase, or otherwise interact with us.
          </p>
          <p>
            This policy complies with the <strong>Kenyan Data Protection Act, 2019</strong>, and, where applicable, the EU General Data Protection Regulation (GDPR), UK GDPR, California Consumer Privacy Act (CCPA/CPRA), and other applicable privacy laws.
          </p>
        </div>
      ),
    },
    {
      num: "2",
      title: "Data Controller",
      icon: "domain",
      content: (
        <div className="space-y-2">
          <p>The data controller responsible for your personal data is:</p>
          <ul className="space-y-1 pl-2">
            <li><strong>Name:</strong> Cepine Juj4 ({STORE_CONFIG.name})</li>
            <li><strong>Physical Address:</strong> {STORE_CONFIG.address}</li>
            <li><strong>Email:</strong> <a href={`mailto:${STORE_CONFIG.email}`} className="underline">{STORE_CONFIG.email}</a></li>
            <li><strong>Phone:</strong> <a href={`tel:${STORE_CONFIG.phone}`} className="underline">{STORE_CONFIG.phone}</a></li>
            <li><strong>Data Protection Inquiries:</strong> <a href={`mailto:${STORE_CONFIG.email}`} className="underline">{STORE_CONFIG.email}</a></li>
          </ul>
        </div>
      ),
    },
    {
      num: "3",
      title: "Personal Data We Collect",
      icon: "dataset",
      content: (
        <div className="space-y-3">
          <p>We may collect the following categories of personal data:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-surface-container">
              <thead className="bg-surface-container font-bold text-on-surface uppercase">
                <tr>
                  <th className="p-2 border border-surface-container">Category</th>
                  <th className="p-2 border border-surface-container">Examples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Identity Data</td>
                  <td className="p-2 border border-surface-container">Full name, username, date of birth.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Contact Data</td>
                  <td className="p-2 border border-surface-container">Email address, phone number, delivery address, billing address.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Account Data</td>
                  <td className="p-2 border border-surface-container">Username, encrypted password, account preferences, wishlist items.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Transaction Data</td>
                  <td className="p-2 border border-surface-container">Order history, products purchased, refunds, invoice amounts.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Payment Data</td>
                  <td className="p-2 border border-surface-container">Payment method, transaction IDs, billing address. (Full credit/debit card numbers and CVVs are processed by certified gateways and never stored on our servers).</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Technical Data</td>
                  <td className="p-2 border border-surface-container">IP address, browser type, operating system, device identifiers, time zone.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Usage Data</td>
                  <td className="p-2 border border-surface-container">Pages visited, search queries, cart interactions, referring URLs.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Marketing Data</td>
                  <td className="p-2 border border-surface-container">Newsletter preferences, survey answers, promotional responses.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Customer Service Data</td>
                  <td className="p-2 border border-surface-container">Support emails, chat messages, inquiries, complaints.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      num: "4",
      title: "How We Collect Personal Data",
      icon: "download",
      content: (
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><strong>Directly from you:</strong> when you register, place an order, contact support, subscribe to updates, or complete a form.</li>
          <li><strong>Automatically:</strong> through cookies, server logs, web beacons, and performance monitoring technologies.</li>
          <li><strong>From third parties:</strong> payment processors (e.g., M-Pesa, card networks), delivery partners, and fraud prevention tools where lawful.</li>
        </ul>
      ),
    },
    {
      num: "5",
      title: "Legal Bases for Processing",
      icon: "balance",
      content: (
        <div className="space-y-2">
          <p>Under the Kenya Data Protection Act and international privacy frameworks, we process personal data under:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Consent:</strong> for optional marketing communications and non-essential cookies.</li>
            <li><strong>Contract:</strong> to process and fulfil orders, facilitate delivery, manage your account, and provide support.</li>
            <li><strong>Legal Obligation:</strong> for tax accounting (eTIMS), anti-fraud measures, and statutory compliance.</li>
            <li><strong>Legitimate Interest:</strong> for website security, analytics, service enhancement, and abuse prevention.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "6",
      title: "Purposes of Processing",
      icon: "settings_suggest",
      content: (
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Create and manage user accounts;</li>
          <li>Process, fulfill, dispatch, and track orders;</li>
          <li>Facilitate secure payments and refunds;</li>
          <li>Issue electronic tax invoices through KRA eTIMS;</li>
          <li>Communicate order status, tracking updates, and customer support responses;</li>
          <li>Send marketing communications where you have explicitly opted in;</li>
          <li>Personalise your shopping experience;</li>
          <li>Improve website functionality, security, and performance;</li>
          <li>Detect, prevent, and mitigate fraud and unauthorized activity.</li>
        </ul>
      ),
    },
    {
      num: "7",
      title: "Cookies and Tracking Technologies",
      icon: "cookie",
      content: (
        <div className="space-y-2">
          <p>We use cookies and similar technologies for:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Strictly Necessary:</strong> maintaining your active session, authentication, and shopping cart persistence.</li>
            <li><strong>Analytics & Performance:</strong> aggregate metrics and traffic insights to enhance site speed and usability.</li>
            <li><strong>Preferences:</strong> remembering your display preferences, region, and recent views.</li>
          </ul>
          <p>
            You can control or disable cookies via your browser settings. Disabling essential cookies may impact checkout functionality.
          </p>
        </div>
      ),
    },
    {
      num: "8",
      title: "Sharing of Personal Data",
      icon: "share",
      content: (
        <div className="space-y-3">
          <p>We do not sell your personal data. We may share data with trusted third parties under strict confidentiality and processing agreements:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Payment Processors:</strong> (e.g. M-Pesa, card gateways) to securely process checkout transactions.</li>
            <li><strong>Delivery & Logistics Providers:</strong> public and third-party carriers to deliver physical shipments.</li>
            <li><strong>Hosting & Cloud Infrastructure:</strong> (e.g. Cloudflare, Firebase/Google Cloud) for reliable hosting and database storage.</li>
            <li><strong>Professional Advisers & Regulators:</strong> accountants, auditors, legal counsel, and government agencies where mandated by law.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "9",
      title: "International Data Transfers",
      icon: "public",
      content: (
        <p>
          Your data may be processed on servers hosted by global cloud providers (such as Cloudflare and Google Cloud). Where data transfers occur outside Kenya, we ensure appropriate safeguards are maintained in compliance with the Kenyan Data Protection Act and international standards, including Standard Contractual Clauses (SCCs) and rigorous technical security standards.
        </p>
      ),
    },
    {
      num: "10",
      title: "Data Security",
      icon: "shield",
      content: (
        <p>
          We employ robust technical and organizational security measures, including SSL/TLS encryption in transit, hashed credentials, least-privilege administrative access, and regular vulnerability scanning. While we strive to maintain top-tier protection, no online transmission or storage method is completely infallible.
        </p>
      ),
    },
    {
      num: "11",
      title: "Data Retention",
      icon: "history_toggle_off",
      content: (
        <div className="space-y-2">
          <p>We retain personal data only as long as necessary for the purposes outlined:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Account & Transaction Data:</strong> Retained for 6 years or as required by applicable tax and commercial record-keeping laws.</li>
            <li><strong>Marketing Records:</strong> Retained until you opt-out or withdraw consent.</li>
            <li><strong>Support Logs:</strong> Retained for 1 to 3 years after inquiry resolution.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "12",
      title: "Your Rights under the Kenyan Data Protection Act",
      icon: "gavel",
      content: (
        <div className="space-y-3">
          <p>Under the Kenyan Data Protection Act, 2019, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Be informed of how your personal data is collected and used;</li>
            <li>Access the personal data we hold about you;</li>
            <li>Request rectification of inaccurate, outdated, or incomplete data;</li>
            <li>Request erasure or deletion of data no longer necessary;</li>
            <li>Object to data processing, including direct marketing;</li>
            <li>Request restriction of processing in specific circumstances;</li>
            <li>Data portability (receive your personal data in a structured format);</li>
            <li>Withdraw consent at any time where processing was consent-based.</li>
          </ul>
          <p>
            To exercise your rights, contact us at <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a>. We respond within 30 days as required by law.
          </p>
        </div>
      ),
    },
    {
      num: "13",
      title: "Additional International Rights (GDPR / UK GDPR / CCPA)",
      icon: "language",
      content: (
        <p>
          Residents of the EEA, UK, and California are entitled to statutory protections including the right to erasure (&ldquo;right to be forgotten&rdquo;), right to lodge complaints with supervisory authorities, and California rights to know, delete, and opt out of cross-context behavioral marketing. Contact <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a> to submit inquiries.
        </p>
      ),
    },
    {
      num: "14",
      title: "Marketing Communications",
      icon: "campaign",
      content: (
        <p>
          We only send marketing emails or SMS if you have opted in. You can unsubscribe anytime by clicking the &ldquo;Unsubscribe&rdquo; link in emails or by contacting support. Unsubscribing does not affect crucial transactional notices regarding your orders or account security.
        </p>
      ),
    },
    {
      num: "15",
      title: "Children's Privacy",
      icon: "child_care",
      content: (
        <p>
          Our platform is not directed at individuals under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has submitted personal information, please contact us immediately for prompt deletion.
        </p>
      ),
    },
    {
      num: "16",
      title: "Automated Decision-Making & Profiling",
      icon: "smart_toy",
      content: (
        <p>
          We do not make decisions solely on automated processing or profiling that produce legal or similarly significant effects on users without human review.
        </p>
      ),
    },
    {
      num: "17",
      title: "Data Breach Notification",
      icon: "crisis_alert",
      content: (
        <p>
          In the unlikely event of a security breach that risks the rights and freedoms of individuals, we will notify affected individuals and the Office of the Data Protection Commissioner (ODPC) in Kenya without undue delay as mandated by law.
        </p>
      ),
    },
    {
      num: "18",
      title: "Complaints & Supervisory Authority",
      icon: "report",
      content: (
        <div className="space-y-3">
          <p>
            If you have questions or complaints regarding data privacy, please contact us first at <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a>.
          </p>
          <p>
            You also have the right to lodge a complaint with the regulatory authority:
          </p>
          <div className="bg-surface-container p-4 border border-on-surface">
            <p className="font-bold text-on-surface">Office of the Data Protection Commissioner, Kenya (ODPC)</p>
            <p>Website: <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="underline">https://www.odpc.go.ke</a></p>
            <p>Email: info@odpc.go.ke / complaints@odpc.go.ke</p>
            <p>Address: Britam Tower, 12th & 13th Floor, Hospital Road, Upper Hill, P.O. Box 30920-00100, Nairobi, Kenya</p>
          </div>
        </div>
      ),
    },
    {
      num: "19",
      title: "Changes to This Privacy Policy",
      icon: "update",
      content: (
        <p>
          We may update this Privacy Policy from time to time to reflect evolving practices or regulatory requirements. The latest version will always be published on this page with the updated date.
        </p>
      ),
    },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-12">
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <span className="text-on-surface">Privacy Policy</span>
      </nav>

      <section className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="inline-block bg-primary-container text-on-primary-container font-extrabold text-xs px-3 py-1 uppercase tracking-widest border border-on-surface">
            Legal & Data Protection
          </span>
          <h1 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tight text-on-surface">
            Privacy Policy
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
            By using {STORE_CONFIG.name}, you acknowledge and agree to this Privacy Policy.
          </p>
          <div className="flex justify-center gap-6">
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
      </section>
    </main>
  );
}
