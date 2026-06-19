'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Icon from '@/components/Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-[400px] shadow-[4px_4px_0px_0px_var(--color-on-surface)]
              border-2 border-on-surface animate-in slide-in-from-bottom-5 fade-in duration-300
              ${toast.type === 'success' ? 'bg-primary-container text-on-primary-container' : ''}
              ${toast.type === 'error' ? 'bg-error text-white' : ''}
              ${toast.type === 'info' ? 'bg-surface text-on-surface' : ''}
              ${toast.type === 'warning' ? 'bg-amber-400 text-black' : ''}
            `}
          >
            <Icon 
              name={
                toast.type === 'success' ? 'check_circle' :
                toast.type === 'error' ? 'error' :
                toast.type === 'warning' ? 'warning' : 'info'
              } 
              className="text-xl shrink-0" 
            />
            <p className="font-bold text-sm tracking-wide break-words flex-grow">{toast.message}</p>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
