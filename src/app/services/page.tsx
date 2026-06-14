'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceWithMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesQuery = query(collection(db, "products"), where("itemType", "==", "service"));
        const snapshot = await getDocs(servicesQuery);
        
        const servicesList: ServiceWithMerchant[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as Product;
          const serviceData = { id: docSnap.id, ...data } as ServiceWithMerchant;
          
          // Fetch merchant info
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
          
          servicesList.push(serviceData);
        }
        
        setServices(servicesList);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, []);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category || 'Other')))];
  
  const filteredServices = selectedCategory === 'All' 
    ? services 
    : services.filter(s => (s.category || 'Other') === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-on-surface border-t-primary-container rounded-full animate-spin mx-auto mb-6 shadow-[4px_4px_0px_0px_var(--color-on-surface)]"></div>
          <h2 className="font-headline-md font-black uppercase text-on-surface tracking-widest text-xl">
            Loading Services...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-6 py-12 md:px-16 max-w-[1440px] mx-auto">
      <div className="mb-12 border-b-4 border-on-surface pb-6 inline-block w-full">
        <h1 className="font-headline-lg font-black text-5xl uppercase text-on-surface">Premium Services</h1>
        <p className="mt-4 text-xl font-bold text-secondary">Discover and book expert services from trusted merchants.</p>
      </div>

      {services.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-4 mb-10">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 border-2 border-on-surface font-bold uppercase transition-all duration-200 active:translate-y-1 active:shadow-none ${
                  selectedCategory === category
                    ? 'bg-primary-container text-on-primary-container shadow-[4px_4px_0px_0px_var(--color-on-surface)] translate-y-[-2px]'
                    : 'bg-surface hover:bg-surface-container text-on-surface'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map(service => (
              <div 
                key={service.id}
                className="flex flex-col bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)] hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_var(--color-on-surface)] transition-all duration-300"
              >
                <div className="relative w-full h-64 border-b-4 border-on-surface bg-surface-dim overflow-hidden flex items-center justify-center">
                  {service.imageUrls?.[0] ? (
                    <Image
                      src={service.imageUrls[0]}
                      alt={service.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <Icon name="design_services" className="text-6xl text-on-surface opacity-20" />
                  )}
                  <div className="absolute top-4 left-4 bg-primary-container text-on-primary-container px-3 py-1 font-bold text-sm border-2 border-on-surface uppercase shadow-[2px_2px_0px_0px_var(--color-on-surface)]">
                    {service.category || 'Service'}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="font-black text-2xl uppercase leading-tight line-clamp-2">{service.name}</h2>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 text-secondary font-semibold border-b-2 border-on-surface pb-4">
                    <Icon name="storefront" className="text-lg" />
                    <span className="uppercase text-sm tracking-wider">{service.storeName}</span>
                  </div>
                  
                  <p className="text-on-surface font-medium line-clamp-3 mb-6 flex-grow whitespace-pre-line">
                    {service.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 bg-surface-container border-2 border-on-surface p-4">
                    <div>
                      <span className="block text-xs uppercase font-bold text-secondary mb-1">Duration</span>
                      <div className="flex items-center gap-2 font-black">
                        <Icon name="schedule" className="text-lg" />
                        {formatDuration(service.duration || 60)}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs uppercase font-bold text-secondary mb-1">Starting At</span>
                      <div className="flex items-center gap-2 font-black text-primary-container text-xl">
                        Ksh {service.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/services/${service.id}`}
                    className="w-full inline-block text-center bg-primary-container text-on-primary-container font-black uppercase tracking-wider py-4 border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:bg-[#ffb05c] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-on-surface)]">
          <Icon name="build" className="text-6xl text-secondary mb-4" />
          <h2 className="font-headline-md font-black text-2xl uppercase mb-2">No Services Available</h2>
          <p className="text-secondary font-bold">Check back later or register as a merchant to add your own services!</p>
        </div>
      )}
    </div>
  );
}
