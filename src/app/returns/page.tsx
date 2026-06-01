import Link from 'next/link';
import Icon from '@/components/Icon';

export default function ReturnsPage() {
  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-12">
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <span className="text-on-surface">Returns & Refunds</span>
      </nav>

      <section className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="font-headline-md text-4xl md:text-5xl font-black uppercase tracking-tight text-on-surface">Returns & Refunds</h1>
          <p className="font-extrabold text-xs uppercase tracking-wider text-secondary">Our 30-Day Hassle-Free Guarantee</p>
        </div>

        <div className="bg-white border-2 border-on-surface p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(26,28,28,1)] space-y-10">
          
          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="event" className="text-primary-container" />
              Return Window
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              We accept returns within 30 days of the original purchase date. Items must be unworn, unwashed, and in their original condition with all tags attached.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="list_alt" className="text-primary-container" />
              How to Return an Item
            </h2>
            <ol className="space-y-6 list-decimal list-inside font-body-md text-sm text-secondary font-medium pl-4">
              <li className="pl-2">
                <strong className="text-on-surface font-bold">Initiate the Return:</strong> Contact our support team via the Contact page or email support@juj4.com with your order number.
              </li>
              <li className="pl-2">
                <strong className="text-on-surface font-bold">Receive Label:</strong> We will provide a prepaid shipping label via email.
              </li>
              <li className="pl-2">
                <strong className="text-on-surface font-bold">Pack & Ship:</strong> Securely pack the item(s) in original packaging and attach the label. Drop it off at any authorized carrier location.
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="payments" className="text-primary-container" />
              Refund Process
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              Once we receive and inspect your return, we will process the refund to your original method of payment. Please allow 5-7 business days for the credit to appear on your statement. Original shipping costs are non-refundable.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="swap_horiz" className="text-primary-container" />
              Exchanges
            </h2>
            <p className="font-body-md text-sm text-secondary font-medium leading-relaxed">
              To exchange an item, please return the original item for a refund and place a new order. This ensures you get the item you want before it sells out.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-surface-container pb-2">
              <Icon name="block" className="text-error" />
              Non-Returnable Items
            </h2>
            <ul className="list-disc list-inside font-body-md text-sm text-secondary font-medium space-y-2">
              <li>Final sale items</li>
              <li>Intimates and swimwear</li>
              <li>Gift cards</li>
              <li>Items worn, washed, or altered</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
