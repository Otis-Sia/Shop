'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Icon from '@/components/Icon';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      const code = err?.code || '';
      if (code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (code === 'auth/user-not-found') {
        setErrorMessage('No account found with this email address.');
      } else {
        setErrorMessage('Something went wrong. Please try again later.');
      }
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center py-20 px-4 md:px-16 min-h-[calc(100vh-140px)]">
      <div className="w-full max-w-[520px] bg-surface border-2 border-on-background shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        {/* Header */}
        <div className="bg-on-background text-background p-8 md:p-10">
          <Link href="/" className="inline-block mb-6 flex items-center gap-2">
            <Image src="/Logo.svg" alt="Logo" width={40} height={40} className="w-auto h-10 invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0" style={{ width: 'auto' }} />
            <Image src="/name.svg" alt="JUJ4" width={100} height={40} className="w-auto h-6 invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0" />
          </Link>
          <h1 className="font-headline-md text-2xl md:text-3xl font-black uppercase tracking-tight mb-2">
            Reset Password
          </h1>
          <p className="font-body-md text-sm opacity-80 leading-relaxed">
            Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 md:p-10">
          {/* Success State */}
          {status === 'success' ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-green-50 border-2 border-green-600">
                <Icon name="check_circle" className="text-green-600 text-2xl mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-green-800 mb-1">Password reset email sent!</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Check your inbox for a link to reset your password. If it doesn&apos;t appear within a few minutes, check your spam folder.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setEmail('');
                }}
                className="w-full h-14 border-2 border-on-background font-headline-md font-bold uppercase tracking-wider text-sm transition-all hover:bg-surface-container-low active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Icon name="refresh" className="text-lg" />
                Send Another Link
              </button>

              <Link
                href="/login"
                className="w-full h-14 bg-on-background text-white font-headline-md font-bold uppercase tracking-wider text-sm transition-all hover:bg-neutral-800 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Icon name="arrow_back" className="text-lg" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {status === 'error' && errorMessage && (
                <div className="p-4 bg-error-container border-2 border-error text-on-error-container font-semibold text-sm flex items-start gap-3">
                  <Icon name="error" className="text-error text-xl mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <label
                  className="font-bold text-xs tracking-wider block text-on-background uppercase"
                  htmlFor="reset-email"
                >
                  Email Address
                </label>
                <input
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all"
                  id="reset-email"
                  placeholder="name@domain.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={status === 'submitting'}
                />
              </div>

              <button
                className="w-full h-14 bg-primary-container text-on-primary-container font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-[0.98] border-b-4 border-on-background flex items-center justify-center hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? (
                  <>
                    <Icon name="progress_activity" className="text-lg mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-container-highest"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-3 text-secondary font-bold tracking-wider">
                    Or
                  </span>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full h-14 border-2 border-on-background font-headline-md font-bold uppercase tracking-wider text-sm transition-all hover:bg-surface-container-low active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Icon name="arrow_back" className="text-lg" />
                Back to Sign In
              </Link>

              <p className="text-xs text-secondary text-center leading-relaxed">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="underline font-bold text-on-background hover:text-primary-container"
                >
                  Create one here
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
