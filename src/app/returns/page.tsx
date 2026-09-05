import Link from 'next/link';
import Icon from '@/components/Icon';
import { STORE_CONFIG } from '@/lib/config/store';

export default function ReturnsPage() {
  const sections = [
    {
      num: "1",
      title: "Introduction",
      icon: "info",
      content: (
        <p>
          This Return and Refund Policy applies to purchases made through <strong>{STORE_CONFIG.name}</strong> (<Link href="https://juj4.cepine.com" className="underline font-bold text-on-surface hover:text-primary-container">https://juj4.cepine.com</Link>) operated by <strong>Cepine Juj4</strong>, located in {STORE_CONFIG.address}, contact email <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a> and phone <a href={`tel:${STORE_CONFIG.phone}`} className="underline font-bold">{STORE_CONFIG.phone}</a>. This policy is designed to comply with the <strong>Kenyan Consumer Protection Act, 2012</strong>, and does not limit any statutory rights you may have under Kenyan law.
        </p>
      ),
    },
    {
      num: "2",
      title: "Your Statutory Rights",
      icon: "verified_user",
      content: (
        <div className="space-y-2">
          <p>Under the Kenyan Consumer Protection Act, goods must:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Match their description;</li>
            <li>Be of acceptable quality;</li>
            <li>Be fit for their intended purpose;</li>
            <li>Comply with any express warranties given.</li>
          </ul>
          <p>
            If a product fails to meet these standards, you may be entitled to a repair, replacement, or refund. Nothing in this policy excludes or limits these rights.
          </p>
        </div>
      ),
    },
    {
      num: "3",
      title: "Returns Due to Defect, Damage, or Non-Conformity",
      icon: "report_problem",
      content: (
        <div className="space-y-3">
          <p>
            If you receive a product that is damaged in transit, defective, faulty, not as described, or unfit for purpose, you must notify us within <strong>7 days</strong> of delivery by emailing <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a>.
          </p>
          <p>Please provide:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Your order number;</li>
            <li>A clear description of the issue;</li>
            <li>Photographs or video evidence of the defect/damage.</li>
          </ul>
          <p>
            We will review your claim and provide a remedy (full/partial refund, replacement, or repair). We will bear the cost of return shipping for defective, damaged, or non-conforming goods via prepaid label or reimbursement.
          </p>
        </div>
      ),
    },
    {
      num: "4",
      title: "Change-of-Mind Returns",
      icon: "published_with_changes",
      content: (
        <div className="space-y-3">
          <p>If you change your mind about a purchase, you may return the product under the following conditions:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-surface-container">
              <thead className="bg-surface-container font-bold text-on-surface uppercase">
                <tr>
                  <th className="p-2 border border-surface-container">Condition</th>
                  <th className="p-2 border border-surface-container">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Time Limit</td>
                  <td className="p-2 border border-surface-container">Within 7 days of delivery</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Product Condition</td>
                  <td className="p-2 border border-surface-container">Unused, unwashed, in original packaging, with all tags and accessories intact</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Product Exclusions</td>
                  <td className="p-2 border border-surface-container">Excludes perishable goods, custom items, underwear, swimwear, earrings, and digital items</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Return Shipping Cost</td>
                  <td className="p-2 border border-surface-container">Paid by customer for change-of-mind returns</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-on-surface border border-surface-container">Restocking Fee</td>
                  <td className="p-2 border border-surface-container">None</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            To initiate, email <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a> with your order number. Returns sent without prior authorization may be refused.
          </p>
        </div>
      ),
    },
    {
      num: "5",
      title: "Non-Returnable Items",
      icon: "block",
      content: (
        <div className="space-y-2">
          <p>The following items cannot be returned unless defective or non-conforming:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Perishable goods (food, flowers, etc.);</li>
            <li>Personalised or custom-made products;</li>
            <li>Intimate or sanitary goods (underwear, swimwear, earrings, etc.);</li>
            <li>Digital products, software, or downloadable content once accessed;</li>
            <li>Gift cards or vouchers;</li>
            <li>Items marked as &ldquo;final sale&rdquo; at the time of purchase.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "6",
      title: "Return Process",
      icon: "list_alt",
      content: (
        <ol className="list-decimal list-inside space-y-2 pl-2">
          <li><strong>Contact Us:</strong> Email <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a> within 7 days of delivery with your order number and return reason.</li>
          <li><strong>Receive Authorization:</strong> We will issue a Return Merchandise Authorisation (RMA) number and return address instructions.</li>
          <li><strong>Package & Ship:</strong> Securely package the item with all original packaging, include the RMA number, and ship using a traceable carrier method.</li>
          <li><strong>Inspection & Approval:</strong> Once received and inspected, we will notify you of approval or rejection.</li>
        </ol>
      ),
    },
    {
      num: "7",
      title: "Refunds",
      icon: "payments",
      content: (
        <div className="space-y-3">
          <p>Approved refunds are processed to your original payment method within 7 to 14 business days after inspection:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Mobile Money (M-Pesa / Airtel Money):</strong> Refund is credited directly to the phone number used at purchase.</li>
            <li><strong>Card Payments:</strong> May take 5–10 additional business days to reflect depending on your issuing bank.</li>
            <li><strong>eTIMS Compliance:</strong> We issue an electronic credit note through the KRA eTIMS system where required.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "8",
      title: "Exchanges",
      icon: "swap_horiz",
      content: (
        <p>
          If you wish to exchange a product for a different size, colour, or variant, please contact us at <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a>. Exchanges depend on real-time stock availability.
        </p>
      ),
    },
    {
      num: "9",
      title: "Incorrect or Missing Items",
      icon: "inventory",
      content: (
        <p>
          If you receive an incorrect item or an item is missing from your order, notify us within <strong>48 hours</strong> of delivery. We will promptly arrange for the correct item to be dispatched or a refund issued without additional delivery costs.
        </p>
      ),
    },
    {
      num: "10",
      title: "Late or Missing Refunds",
      icon: "pending",
      content: (
        <div className="space-y-2">
          <p>If you have not received an approved refund within the stated timeframe:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Check your M-Pesa / bank statement again;</li>
            <li>Contact your bank or mobile operator as processing times may vary;</li>
            <li>Contact us at <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a> with your order number and refund reference.</li>
          </ul>
        </div>
      ),
    },
    {
      num: "11",
      title: "Contact Information",
      icon: "contacts",
      content: (
        <div className="space-y-1 pl-2">
          <p><strong>Email:</strong> <a href={`mailto:${STORE_CONFIG.email}`} className="underline font-bold">{STORE_CONFIG.email}</a></p>
          <p><strong>Phone:</strong> <a href={`tel:${STORE_CONFIG.phone}`} className="underline font-bold">{STORE_CONFIG.phone}</a></p>
          <p><strong>Address:</strong> {STORE_CONFIG.address}</p>
          <p><strong>Support Hours:</strong> {STORE_CONFIG.businessHours}</p>
        </div>
      ),
    },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-12">
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <span className="text-on-surface">Return and Refund Policy</span>
      </nav>

      <section className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="inline-block bg-primary-container text-on-primary-container font-extrabold text-xs px-3 py-1 uppercase tracking-widest border border-on-surface">
            Customer Guarantee
          </span>
          <h1 className="font-headline-md text-3xl md:text-5xl font-black uppercase tracking-tight text-on-surface">
            Return &amp; Refund Policy
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
            Questions regarding our return and refund process?
          </p>
          <div className="flex justify-center gap-6">
            <Link
              href="/terms"
              className="text-xs font-bold uppercase tracking-wider text-on-background hover:text-primary-container underline transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-xs font-bold uppercase tracking-wider text-on-background hover:text-primary-container underline transition-colors"
            >
              Privacy Policy
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
