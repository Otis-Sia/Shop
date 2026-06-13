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

  if (!mounted) {
    // Placeholder to prevent layout shift before hydration
    return (
      <div className="w-[104px] h-[36px] bg-surface border-2 border-on-surface rounded-full shadow-[2px_2px_0px_0px_var(--color-on-surface)] opacity-50"></div>
    );
  }

  // Calculate sliding indicator position based on active theme
  const getIndicatorPosition = () => {
    switch (theme) {
      case 'light': return 'translate-x-[2px]';
      case 'system': return 'translate-x-[34px]';
      case 'dark': return 'translate-x-[66px]';
      default: return 'translate-x-[34px]'; // fallback
    }
  };

  return (
    <div className="relative inline-flex items-center p-1 bg-surface border-2 border-on-surface rounded-full shadow-[2px_2px_0px_0px_var(--color-on-surface)]">
      
      {/* Sliding Active Pill */}
      <div 
        className={`absolute top-1 bottom-1 w-8 bg-primary-container border-2 border-on-surface rounded-full transition-transform duration-300 ease-out z-0 ${getIndicatorPosition()}`}
      />

      <button
        onClick={() => setTheme('light')}
        title="Light Theme"
        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          theme === 'light' ? 'text-on-primary-container' : 'text-secondary hover:text-on-surface'
        }`}
      >
        <Icon name="light_mode" className="text-sm font-bold" />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        title="System Auto Theme"
        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          theme === 'system' ? 'text-on-primary-container' : 'text-secondary hover:text-on-surface'
        }`}
      >
        <Icon name="brightness_auto" className="text-sm font-bold" />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        title="Dark Theme"
        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          theme === 'dark' ? 'text-on-primary-container' : 'text-secondary hover:text-on-surface'
        }`}
      >
        <Icon name="dark_mode" className="text-sm font-bold" />
      </button>

    </div>
  );
}
