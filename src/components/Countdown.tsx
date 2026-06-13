'use client';

import { useState, useEffect } from 'react';

export default function Countdown() {
  // Target date: September 1st, 2026
  const targetDate = new Date('2026-09-01T00:00:00').getTime();
  
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    setMounted(true);
    
    const calculateTimeLeft = () => {
      const difference = targetDate - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) {
    return <div className="h-28"></div>; // Placeholder space
  }

  return (
    <div className="flex gap-2 sm:gap-4 justify-center items-center my-8">
      <div className="flex flex-col items-center w-20 sm:w-24 py-4 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <span className="font-headline-md text-3xl sm:text-4xl font-black text-primary-container">{timeLeft.days}</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary mt-1">Days</span>
      </div>
      <div className="text-xl sm:text-2xl font-black text-on-surface/50 animate-pulse">:</div>
      
      <div className="flex flex-col items-center w-20 sm:w-24 py-4 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <span className="font-headline-md text-3xl sm:text-4xl font-black text-primary-container">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary mt-1">Hours</span>
      </div>
      <div className="text-xl sm:text-2xl font-black text-on-surface/50 animate-pulse">:</div>
      
      <div className="flex flex-col items-center w-20 sm:w-24 py-4 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <span className="font-headline-md text-3xl sm:text-4xl font-black text-primary-container">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary mt-1">Mins</span>
      </div>
      <div className="text-xl sm:text-2xl font-black text-on-surface/50 animate-pulse">:</div>
      
      <div className="flex flex-col items-center w-20 sm:w-24 py-4 bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <span className="font-headline-md text-3xl sm:text-4xl font-black text-primary-container">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary mt-1">Secs</span>
      </div>
    </div>
  );
}
