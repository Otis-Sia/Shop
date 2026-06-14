'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/components/Icon';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/types/schema';

interface ServiceWithMerchant extends Product {
  storeName: string;
}

const formatDuration = (mins: number) => {
  if (!mins) return 'N/A';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export default function ServiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [service, setService] = useState<ServiceWithMerchant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchService = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Product;
          const serviceData = { id: docSnap.id, ...data } as ServiceWithMerchant;
          
          if (data.merchantId) {
            try {
              const userDoc = await getDoc(doc(db, "users", data.merchantId));
              if (userDoc.exists()) {
                serviceData.storeName = userDoc.data().storeName || 'Independent Professional';
              } else {
                serviceData.storeName = 'Independent Professional';
              }
            } catch (e) {
              serviceData.storeName = 'Independent Professional';
            }
          } else {
            serviceData.storeName = 'Independent Professional';
          }
          
          setService(serviceData);
        }
      } catch (error) {
        console.error("Error fetching service details:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchService();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-on-surface border-t-primary-container rounded-full animate-spin mx-auto mb-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)]"></div>
          <h2 className="font-headline-md font-black uppercase text-on-surface tracking-widest text-xl">
            Loading Details...
          </h2>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <Icon name="error_outline" className="text-6xl text-error mb-4" />
        <h2 className="font-headline-md font-black text-3xl uppercase mb-4 text-on-surface">Service Not Found</h2>
        <Link 
          href="/services" 
          className="px-6 py-3 bg-primary-container text-on-primary-container font-black uppercase tracking-wider border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-on-surface)] transition-all"
        >
          Back to Services
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-6 py-12 md:px-16 max-w-[1440px] mx-auto">
      <div className="mb-8">
        <Link 
          href="/services" 
          className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-secondary hover:text-on-surface transition-colors"
        >
          <Icon name="arrow_back" /> Back to All Services
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column - Image */}
        <div className="flex flex-col">
          <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square border-4 border-on-surface bg-surface-dim overflow-hidden shadow-[8px_8px_0px_0px_var(--color-on-surface)]">
            {service.imageUrls?.[0] ? (
              <Image
                src={service.imageUrls[0]}
                alt={service.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="design_services" className="text-8xl text-on-surface opacity-20" />
              </div>
            )}
            <div className="absolute top-6 left-6 bg-primary-container text-on-primary-container px-4 py-2 font-black text-lg border-2 border-on-surface uppercase shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
              {service.category || 'Service'}
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="flex flex-col justify-start">
          <div className="border-b-4 border-on-surface pb-6 mb-8">
            <h1 className="font-headline-lg font-black text-4xl md:text-5xl uppercase text-on-surface leading-tight mb-4">
              {service.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-lg font-bold text-secondary">
              <div className="flex items-center gap-2">
                <Icon name="storefront" className="text-xl" />
                <span className="uppercase tracking-wider">{service.storeName}</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container px-3 py-1 border-2 border-on-surface text-on-surface">
                <Icon name="star" className="text-warning text-lg" />
                <span>New</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border-4 border-on-surface p-6 shadow-[6px_6px_0px_0px_var(--color-on-surface)] mb-8">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="block text-sm uppercase font-black text-secondary mb-2 tracking-widest">Duration</span>
                <div className="flex items-center gap-3 font-black text-2xl text-on-surface">
                  <Icon name="schedule" className="text-3xl" />
                  {formatDuration(service.duration || 60)}
                </div>
              </div>
              <div>
                <span className="block text-sm uppercase font-black text-secondary mb-2 tracking-widest">Pricing</span>
                <div className="flex items-center gap-3 font-black text-2xl text-primary-container">
                  <Icon name="payments" className="text-3xl" />
                  Ksh {service.price.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-10 flex-grow">
            <h3 className="font-black text-xl uppercase mb-4 border-b-2 border-on-surface inline-block pb-1">Description</h3>
            <div className="text-on-surface text-lg font-medium leading-relaxed whitespace-pre-line">
              {service.description || "No description provided for this service."}
            </div>
          </div>

          <div className="mt-auto">
            <button 
              onClick={() => alert(`Booking flow for ${service.name} coming soon!`)}
              className="w-full bg-primary-container text-on-primary-container font-black text-xl uppercase tracking-widest py-6 border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)] hover:bg-[#ffb05c] active:shadow-none active:translate-x-[8px] active:translate-y-[8px] transition-all"
            >
              Book This Service
            </button>
            <p className="text-center text-secondary font-bold text-sm mt-4 uppercase tracking-widest">
              Secure booking guaranteed by JUJ4
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
