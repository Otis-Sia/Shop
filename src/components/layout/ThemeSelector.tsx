'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getIndicatorPosition = () => {
    switch (theme) {
      case 'light': return 'translate-x-0';
      case 'system': return 'translate-x-6';
      case 'dark': return 'translate-x-12';
      default: return 'translate-x-6';
    }
  };

  return (
    <div className="relative inline-flex items-center p-0.5 bg-surface border-2 border-on-surface rounded-full h-8 w-20">
      
      {/* Sliding Active Pill */}
      {mounted && (
        <div 
          className={`absolute left-0.5 top-0.5 bottom-0.5 w-6 bg-primary-container border-2 border-on-surface rounded-full transition-transform duration-300 ease-out z-0 ${getIndicatorPosition()}`}
        />
      )}

      <button
        onClick={() => setTheme('light')}
        title="Light Theme"
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          mounted && theme === 'light' ? 'text-on-primary-container' : 'text-secondary hover:text-on-surface'
        }`}
      >
        <Icon name="light_mode" className="text-[12px] font-bold" />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        title="System Auto Theme"
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          mounted && theme === 'system' ? 'text-on-primary-container' : 'text-secondary hover:text-on-surface'
        }`}
      >
        <span className="hidden sm:flex items-center justify-center"><Icon name="brightness_auto" className="text-[12px] font-bold" /></span>
        <span className="sm:hidden flex items-center justify-center"><Icon name="smartphone" className="text-[12px] font-bold" /></span>
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        title="Dark Theme"
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          mounted && theme === 'dark' ? 'text-on-primary-container' : 'text-secondary hover:text-on-surface'
        }`}
      >
        <Icon name="dark_mode" className="text-[12px] font-bold" />
      </button>

    </div>
  );
}
