'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'contact_messages'), {
        ...formData,
        createdAt: Timestamp.now()
      });
      setStatus('success');
      setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      console.error('Failed to submit message:', err);
      setStatus('error');
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 flex-grow space-y-12">
      <nav className="font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5 pb-2 border-b-2 border-surface-container">
        <Link href="/" className="hover:text-on-surface">Home</Link>
        <span>/</span>
        <span className="text-on-surface">Contact Us</span>
      </nav>

      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="font-headline-md text-4xl md:text-5xl font-black uppercase tracking-tight text-on-surface">Get in Touch</h1>
        <p className="font-body-md text-sm text-secondary font-medium">Have a question about an order, our products, or anything else? We'd love to hear from you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        {/* Contact Form */}
        <div className="bg-surface border-2 border-on-surface p-8 md:p-12 shadow-[8px_8px_0px_0px_var(--color-on-surface)]">
          <h2 className="font-headline-md text-2xl font-black uppercase tracking-tight mb-8">Send a Message</h2>
          
          {status === 'success' ? (
            <div className="bg-green-50 border-2 border-green-600 p-8 text-center space-y-4">
              <Icon name="check_circle" className="text-5xl text-green-600 mx-auto" />
              <h3 className="font-headline-md font-bold text-xl uppercase text-green-800">Message Sent!</h3>
              <p className="text-sm font-semibold text-green-700">Thank you for reaching out. We'll get back to you within 24 hours.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-4 border-2 border-green-600 px-6 py-2 font-bold text-xs uppercase tracking-wider text-green-800 hover:bg-green-600 hover:text-white transition-colors"
              >
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 border-2 border-on-surface bg-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container transition-all" 
                  placeholder="Jane Doe"
                />
              </div>
              
              <div className="space-y-2">
                <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 border-2 border-on-surface bg-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container transition-all" 
                  placeholder="jane@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Subject</label>
                <select 
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-on-surface bg-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container transition-all cursor-pointer appearance-none"
                >
                  <option>General Inquiry</option>
                  <option>Order Issue</option>
                  <option>Returns & Exchanges</option>
                  <option>Product Question</option>
                  <option>Wholesale</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="font-extrabold text-xs uppercase tracking-wider block text-on-surface">Message</label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full p-4 border-2 border-on-surface bg-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container transition-all resize-y" 
                  placeholder="How can we help you?"
                ></textarea>
              </div>

              {status === 'error' && (
                <div className="bg-red-50 text-error p-3 border-2 border-error text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Icon name="error" /> Failed to send message. Please try again.
                </div>
              )}

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="w-full h-14 bg-primary-container text-on-primary-container font-headline-md font-black uppercase tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:bg-amber-500 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {status === 'submitting' ? (
                  <><Icon name="sync" className="animate-spin" /> Sending...</>
                ) : (
                  <><Icon name="send" /> Send Message</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Company Info */}
        <div className="space-y-8">
          <div className="bg-surface-container border-2 border-on-surface p-8">
            <h3 className="font-headline-md text-xl font-black uppercase tracking-tight mb-6">Contact Information</h3>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-container border-2 border-on-surface flex items-center justify-center text-on-primary-container flex-shrink-0">
                  <Icon name="email" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface">Email Us</h4>
                  <a href="mailto:support@juj4.com" className="font-body-md text-sm font-medium text-secondary hover:text-primary-container transition-colors">support@juj4.com</a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-container border-2 border-on-surface flex items-center justify-center text-on-primary-container flex-shrink-0">
                  <Icon name="phone" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface">Call Us</h4>
                  <p className="font-body-md text-sm font-medium text-secondary">+254 700 000 000</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-container border-2 border-on-surface flex items-center justify-center text-on-primary-container flex-shrink-0">
                  <Icon name="location_on" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface">Location</h4>
                  <p className="font-body-md text-sm font-medium text-secondary">Nairobi, Kenya<br/>PO BOX 12345-00100</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-container border-2 border-on-surface flex items-center justify-center text-on-primary-container flex-shrink-0">
                  <Icon name="schedule" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface">Business Hours</h4>
                  <p className="font-body-md text-sm font-medium text-secondary">Monday - Friday: 9am - 6pm (EAT)<br/>Saturday: 10am - 4pm</p>
                </div>
              </li>
            </ul>
          </div>

          {/* FAQs Preview */}
          <div className="bg-surface border-2 border-on-surface p-8">
            <h3 className="font-headline-md text-xl font-black uppercase tracking-tight mb-6">Quick Answers</h3>
            <div className="space-y-4">
              <div className="border-b-2 border-surface-container pb-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider mb-2">How long does shipping take?</h4>
                <p className="font-body-md text-sm text-secondary font-medium">Typically 3-5 business days for standard delivery within the country.</p>
              </div>
              <div className="border-b-2 border-surface-container pb-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider mb-2">Do you ship internationally?</h4>
                <p className="font-body-md text-sm text-secondary font-medium">Currently, we only ship within Kenya. We hope to expand soon!</p>
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider mb-2">Can I modify my order?</h4>
                <p className="font-body-md text-sm text-secondary font-medium">Orders can be modified within 1 hour of placement. Please call us immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
