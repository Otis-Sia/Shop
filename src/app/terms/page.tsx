import Link from 'next/link';
import Icon from '@/components/Icon';
import { STORE_CONFIG } from '@/lib/config/store';
import { CURRENCY_CONFIG } from '@/lib/utils/currency';

export default function TermsOfServicePage() {
  const sections = [
    {
      num: "1",
      title: "Introduction and Acceptance",
      icon: "description",
      content: (
        <div className="space-y-3">
          <p>
            These Terms and Conditions govern your use of <strong>{STORE_CONFIG.name}</strong>, located at <Link href="https://juj4.cepine.com" className="underline font-bold text-on-surface hover:text-primary-container">https://juj4.cepine.com</Link>, and the purchase of products or services from <strong>Cepine Juj4</strong>, operating in Kenya, with registered/operational address at {STORE_CONFIG.address}, contact email <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a>, and phone <a href={`tel:${STORE_CONFIG.phone}`} className="underline font-bold">{STORE_CONFIG.phone}</a>.
          </p>
          <p>
            By accessing the website, creating an account, placing an order, or clicking &ldquo;I Agree&rdquo; during checkout, you accept these Terms and Conditions and agree to be bound by them.
          </p>
          <p className="font-bold text-on-surface">
            If you do not agree, do not use this website or place an order.
          </p>
        </div>
      ),
    },
    {
      num: "2",
      title: "Eligibility",
      icon: "verified_user",
      content: (
        <p>
          You must be at least 18 years old or have the consent of a parent or guardian to use this website. By placing an order, you confirm that you have the legal capacity to enter into a binding contract.
        </p>
      ),
    },
    {
      num: "3",
      title: "Account and Security",
      icon: "account_circle",
      content: (
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate, complete, and current information. We may suspend or terminate your account if we suspect unauthorised use, fraud, or breach of these Terms.
        </p>
      ),
    },
    {
      num: "4",
      title: "Product Information and Availability",
      icon: "inventory_2",
      content: (
        <div className="space-y-3">
          <p>
            We make reasonable efforts to display product descriptions, images, colours, and prices accurately. However, we do not guarantee that your device&apos;s display reflects the actual product.
          </p>
          <p>
            All products are subject to availability. We may limit quantities, reject orders, or cancel orders if a product is out of stock, mispriced, or unavailable for any reason.
          </p>
          <p>
            We reserve the right to discontinue any product at any time without prior notice.
          </p>
        </div>
      ),
    },
    {
      num: "5",
      title: "Orders and Acceptance",
      icon: "shopping_bag",
      content: (
        <div className="space-y-3">
          <p>
            When you place an order, you are making an offer to purchase. Your order is not accepted until we send a written order confirmation or dispatch the goods.
          </p>
          <p>We may refuse or cancel any order, including but not limited to situations where:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>The product is unavailable;</li>
            <li>Payment is not authorised;</li>
            <li>The price or description was incorrect;</li>
            <li>We suspect fraud or illegal activity;</li>
            <li>You do not meet the eligibility requirements.</li>
          </ul>
          <p>
            If we cancel an order after payment, we will refund the amount paid in accordance with these Terms.
          </p>
        </div>
      ),
    },
    {
      num: "6",
      title: "Prices, Taxes, and Payment",
      icon: "payments",
      content: (
        <div className="space-y-3">
          <p>
            All prices are stated in {CURRENCY_CONFIG.code} ({CURRENCY_CONFIG.symbol}) and include or exclude applicable taxes as stated at checkout. Prices may change without notice, but changes will not affect confirmed orders except as required by law.
          </p>
          <p>
            You are responsible for any applicable taxes, duties, customs fees, or bank charges. We will issue electronic tax invoices through the KRA eTIMS system where applicable.
          </p>
          <p>
            Payment must be made through the payment methods provided at checkout (including M-Pesa, card payments, and other approved gateways). We use third-party payment processors and do not store full credit or debit card details on our servers.
          </p>
        </div>
      ),
    },
    {
      num: "7",
      title: "Delivery and Shipping Carrier Disclaimer",
      icon: "local_shipping",
      content: (
        <div className="space-y-3">
          <p>
            Delivery timelines are estimates only and are not guaranteed. We utilize public and third-party shipping carriers for order delivery.
          </p>
          <p className="bg-surface-container p-4 border-l-4 border-primary-container font-medium text-on-surface">
            <strong>Shipping Disclaimer & Carrier Liability:</strong> Once an order has been handed over to the carrier, risk of loss, damage, delays, or any incidents occurring during transit are the sole responsibility of and handled directly with the shipping carrier.
          </p>
          <p>
            We are not liable for delays caused by customs, carriers, natural events, strikes, or other circumstances beyond our reasonable control.
          </p>
          <p>
            You must provide an accurate delivery address and contact details. If goods are returned to us due to an incorrect address or failure to collect, you may be responsible for redelivery costs.
          </p>
        </div>
      ),
    },
    {
      num: "8",
      title: "Returns, Refunds, and Replacements",
      icon: "replay",
      content: (
        <div className="space-y-3">
          <p>
            This section must be read together with our <Link href="/returns" className="underline font-bold text-on-surface hover:text-primary-container">Returns & Refunds Policy</Link> and the Kenyan Consumer Protection Act.
          </p>
          <p>
            If a product arrives damaged, defective, not as described, or unfit for purpose, you may be entitled to a repair, replacement, or refund. You must notify us within <strong>7 days</strong> of delivery and provide proof of purchase and photographic evidence of the defect.
          </p>
          <p>
            For change-of-mind returns, items must be initiated within 7 days of delivery, unworn, unwashed, and in original packaging with tags intact. The customer is responsible for return shipping costs unless the item was defective or sent in error.
          </p>
          <p>
            Approved refunds will be processed to the original payment method within 5 to 7 business days following inspection.
          </p>
          <p>
            Nothing in these Terms excludes or limits your statutory rights as a consumer under the Kenyan Consumer Protection Act or any other law that cannot be excluded.
          </p>
        </div>
      ),
    },
    {
      num: "9",
      title: "Warranties and Disclaimers",
      icon: "verified",
      content: (
        <div className="space-y-3">
          <p>
            We warrant that products will materially conform to the description on the website and will be of acceptable quality and fit for their normal purpose.
          </p>
          <p>
            Except as expressly stated, the website and products are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the maximum extent permitted by law, we disclaim all other warranties, express or implied, including fitness for a particular purpose, merchantability, and non-infringement.
          </p>
          <p>
            We do not guarantee that the website will be uninterrupted, secure, error-free, or free from viruses.
          </p>
        </div>
      ),
    },
    {
      num: "10",
      title: "Limitation of Liability",
      icon: "warning",
      content: (
        <div className="space-y-3">
          <p>
            To the maximum extent permitted by law, Cepine Juj4 shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, data, goodwill, or business opportunity.
          </p>
          <p>
            Our total aggregate liability for any claim arising out of or related to your use of the website or purchase of products shall not exceed the total amount you paid for the specific product or service giving rise to the claim, or KSh 10,000, whichever is greater.
          </p>
          <p>Nothing in these Terms limits or excludes our liability for:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Fraud or fraudulent misrepresentation;</li>
            <li>Death or personal injury caused by negligence;</li>
            <li>Gross negligence or wilful misconduct;</li>
            <li>Any liability that cannot be excluded under Kenyan law, including mandatory consumer protection rights.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "11",
      title: "Indemnification",
      icon: "security",
      content: (
        <p>
          You agree to indemnify, defend, and hold harmless Cepine Juj4, its directors, officers, employees, agents, and affiliates from any claims, losses, damages, liabilities, costs, and expenses arising out of: your breach of these Terms; your misuse of the website; your violation of any law or third-party right; or any content you submit or upload.
        </p>
      ),
    },
    {
      num: "12",
      title: "Intellectual Property",
      icon: "copyright",
      content: (
        <div className="space-y-3">
          <p>
            The website, including text, graphics, logos, images, software, and product listings, is owned by or licensed to Cepine Juj4 and is protected by Kenyan and international intellectual property laws.
          </p>
          <p>
            You may not copy, reproduce, modify, distribute, display, sell, or create derivative works from any part of the website without prior written consent.
          </p>
        </div>
      ),
    },
    {
      num: "13",
      title: "User-Generated Content and Reviews",
      icon: "rate_review",
      content: (
        <div className="space-y-3">
          <p>
            If you submit reviews, comments, photos, or other content, you grant us a non-exclusive, royalty-free, worldwide, perpetual licence to use, reproduce, modify, publish, and display that content for marketing and operational purposes.
          </p>
          <p>
            You must not submit content that is unlawful, defamatory, obscene, false, discriminatory, or infringes third-party rights. We may remove or edit user content at our discretion.
          </p>
        </div>
      ),
    },
    {
      num: "14",
      title: "Prohibited Uses",
      icon: "block",
      content: (
        <div className="space-y-2">
          <p>You may not use the website:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>For any unlawful purpose;</li>
            <li>To engage in fraud, hacking, phishing, or cybercrime;</li>
            <li>To upload malware, viruses, or harmful code;</li>
            <li>To infringe intellectual property or other rights;</li>
            <li>To collect or harvest personal data from other users;</li>
            <li>To interfere with the operation or security of the website.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "15",
      title: "Third-Party Links and Services",
      icon: "link",
      content: (
        <p>
          The website may contain links to third-party websites or services. We do not control, endorse, or accept responsibility for the content, privacy practices, or availability of those third parties. You access them at your own risk.
        </p>
      ),
    },
    {
      num: "16",
      title: "Force Majeure",
      icon: "cyclone",
      content: (
        <p>
          We shall not be liable for any failure or delay in performing our obligations if the failure or delay arises from events beyond our reasonable control, including acts of God, pandemic, government restrictions, power outages, cyberattacks, strikes, fire, flood, or failure of third-party services.
        </p>
      ),
    },
    {
      num: "17",
      title: "Termination",
      icon: "cancel",
      content: (
        <p>
          We may suspend or terminate your access to the website or your account at any time, with or without notice, if you breach these Terms or if we suspect illegal or harmful activity. Provisions that by their nature should survive termination, including intellectual property, limitation of liability, indemnification, and governing law, will survive.
        </p>
      ),
    },
    {
      num: "18",
      title: "Changes to These Terms",
      icon: "update",
      content: (
        <p>
          We may update these Terms from time to time. The latest version will always be posted on this page with the &ldquo;Last updated&rdquo; date. Material changes will be notified by email or website notice. Continued use after changes constitutes acceptance.
        </p>
      ),
    },
    {
      num: "19",
      title: "Governing Law and Jurisdiction",
      icon: "gavel",
      content: (
        <p>
          These Terms are governed by and construed in accordance with the laws of the Republic of Kenya. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Kenya, unless mandatory consumer law requires otherwise.
        </p>
      ),
    },
    {
      num: "20",
      title: "Dispute Resolution",
      icon: "balance",
      content: (
        <div className="space-y-3">
          <p>
            Before initiating formal legal proceedings, you agree to contact us at <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a> and attempt to resolve the dispute informally for a period of at least 30 days.
          </p>
          <p>
            If the dispute is not resolved, the parties may submit the dispute to mediation or arbitration in Nairobi under the rules of the Nairobi Centre for International Arbitration (NCIA) or another agreed forum. This clause does not limit your right to seek relief from a competent court where required by law.
          </p>
        </div>
      ),
    },
    {
      num: "21",
      title: "Electronic Communications and Signatures",
      icon: "mail_outline",
      content: (
        <p>
          You agree to receive communications from us electronically by email, SMS, or website notices. You agree that electronic records and signatures satisfy any legal requirement that such communications be in writing.
        </p>
      ),
    },
    {
      num: "22",
      title: "Entire Agreement and Severability",
      icon: "fact_check",
      content: (
        <div className="space-y-3">
          <p>
            These Terms, together with the <Link href="/privacy" className="underline font-bold text-on-surface hover:text-primary-container">Privacy Policy</Link>, <Link href="/returns" className="underline font-bold text-on-surface hover:text-primary-container">Return Policy</Link>, and any order confirmation, constitute the entire agreement between you and Cepine Juj4 regarding the subject matter.
          </p>
          <p>
            If any provision is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.
          </p>
        </div>
      ),
    },
    {
      num: "23",
      title: "Contact Information",
      icon: "contacts",
      content: (
        <div className="space-y-2">
          <p>For questions or complaints about these Terms, contact:</p>
          <ul className="space-y-1 pl-2">
            <li><strong>Company:</strong> Cepine Juj4 ({STORE_CONFIG.name})</li>
            <li><strong>Address:</strong> {STORE_CONFIG.address}</li>
            <li><strong>Email:</strong> <a href={`mailto:${STORE_CONFIG.email}`} className="underline">{STORE_CONFIG.email}</a></li>
            <li><strong>Phone:</strong> <a href={`tel:${STORE_CONFIG.phone}`} className="underline">{STORE_CONFIG.phone}</a></li>
            <li><strong>Customer Support Hours:</strong> {STORE_CONFIG.businessHours}</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-12">
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <span className="text-on-surface">Terms and Conditions of Sale</span>
      </nav>

      <section className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="inline-block bg-primary-container text-on-primary-container font-extrabold text-xs px-3 py-1 uppercase tracking-widest border border-on-surface">
            Legal & Compliance
          </span>
          <h1 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tight text-on-surface">
            Terms and Conditions of Sale
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
            By using {STORE_CONFIG.name} or placing an order, you agree to these Terms.
          </p>
          <div className="flex justify-center gap-6">
            <Link
              href="/privacy"
              className="text-xs font-bold uppercase tracking-wider text-on-background hover:text-primary-container underline transition-colors"
            >
              Privacy Policy
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
