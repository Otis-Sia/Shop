'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login, register, loginWithGoogle } from '@/lib/api/auth';
import { syncLocalCartToFirestore } from '@/lib/api/cart';
import Icon from '@/components/Icon';

interface UnifiedAuthProps {
  initialTab?: 'login' | 'signup';
}

export default function UnifiedAuth({ initialTab = 'login' }: UnifiedAuthProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Signup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Status fields
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login({ email: loginEmail, password: loginPassword });
      await syncLocalCartToFirestore(user.uid);
      // Go to home page
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await register({
        email: signupEmail,
        password: signupPassword,
        first_name: firstName,
        last_name: lastName
      });
      await syncLocalCartToFirestore(user.uid);
      // Go to home page
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center py-20 px-4 md:px-16 min-h-[calc(100vh-140px)]">
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 border-on-background overflow-hidden bg-white">
        
        {/* Left Side: Premium Brand Information Panel */}
        <div className="relative bg-on-background text-surface flex flex-col justify-center p-12 lg:p-16 space-y-6 min-h-[400px]">
          <div className="absolute inset-0 opacity-20">
            <img 
              alt="Cinematic, high-contrast action shot of a professional athlete" 
              className="w-full h-full object-contain mix-blend-multiply" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaOgHlt0Cg_WYRrCQpaY2sqn2VTje6_8X0JjvFZuLmWeBdQ48eiFBQFM5c8dCt1MR5Iy_7xMuEzhlKIn4WVT-rGnzXRY9fKDGcQmzpurc3fN9kHBGuOCARP2mWiqnGHDoIvBukvH73njMt2Rhc6V3ZPo1TCwR-Pvs7_rBuC4Ort0AjXGG6w6yS7wDRfR3PFR6IWuGVuXt5PzNNZiUFIU_G38nWzBj0euxmIH3nfAme8hBxz4Jw51A-gbk0cRCTeNTwsVrjRZcqvUo3"
            />
          </div>
          <div className="relative z-10">
            <span className="inline-block bg-primary-container text-on-primary-container font-extrabold text-xs px-3 py-1 mb-4 uppercase tracking-widest">
              Join Us
            </span>
            <h1 className="font-headline-md text-3xl md:text-4xl font-black mb-6 leading-tight uppercase tracking-tight text-white">
              Member Access Only.
            </h1>
            <p className="font-body-md text-sm md:text-base text-surface-container max-w-[400px] mb-8 leading-relaxed text-gray-300">
              Unlock high-velocity retail experiences, priority shipping, and exclusive product drops. The journey to excellence starts here.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Icon name="bolt" className="text-primary-container text-2xl" />
                <span className="font-bold text-sm tracking-wide">Instant Checkout</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="local_shipping" className="text-primary-container text-2xl" />
                <span className="font-bold text-sm tracking-wide">Free Express Delivery</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="loyalty" className="text-primary-container text-2xl" />
                <span className="font-bold text-sm tracking-wide">Early Access to Sales</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Interactive Form Panel */}
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white min-h-[550px]">
          {/* Tabs */}
          <div className="flex gap-8 mb-10 border-b border-surface-container-highest">
            <button 
              type="button"
              className={`pb-3 font-headline-md text-lg font-bold border-b-4 transition-all duration-200 uppercase ${
                activeTab === 'login' 
                  ? 'border-on-background text-on-background font-extrabold' 
                  : 'border-transparent text-secondary hover:text-on-background'
              }`}
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`pb-3 font-headline-md text-lg font-bold border-b-4 transition-all duration-200 uppercase ${
                activeTab === 'signup' 
                  ? 'border-on-background text-on-background font-extrabold' 
                  : 'border-transparent text-secondary hover:text-on-background'
              }`}
              onClick={() => {
                setActiveTab('signup');
                setError('');
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="p-4 mb-6 bg-error-container border-2 border-error text-on-error-container font-semibold text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="login-email">
                  Email Address
                </label>
                <input 
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all" 
                  id="login-email" 
                  placeholder="name@domain.com" 
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="login-pass">
                    Password
                  </label>
                  <a className="text-xs font-bold text-secondary hover:text-primary-container underline uppercase tracking-wider" href="/forgot-password">
                    Forgot?
                  </a>
                </div>
                <input 
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all" 
                  id="login-pass" 
                  placeholder="••••••••" 
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center gap-3 py-1">
                <input 
                  className="w-5 h-5 border-2 border-on-background text-on-background focus:ring-0 rounded-none cursor-pointer accent-on-background" 
                  id="remember" 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="text-xs font-bold uppercase tracking-wider cursor-pointer text-on-background select-none" htmlFor="remember">
                  Stay logged in for 30 days
                </label>
              </div>

              <button 
                className="w-full h-14 bg-primary-container text-on-primary-container font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-[0.98] border-b-4 border-on-background flex items-center justify-center hover:bg-amber-500" 
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-container-highest"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-secondary font-bold tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={async () => {
                    try {
                      setError('');
                      setSubmitting(true);
                      const user = await loginWithGoogle();
                      await syncLocalCartToFirestore(user.uid);
                      window.location.href = '/';
                    } catch (err: any) {
                      setError(err.message || 'Google sign-in failed');
                      setSubmitting(false);
                    }
                  }}
                  className="h-14 border-2 border-on-background flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider hover:bg-surface-container-low transition-colors"
                >
                  <img 
                    alt="Google Logo" 
                    className="w-5 h-5" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHqgSvWFI7jZB6h0SWvxr8akP6MOaQzMARZ79KLaV_2CiWI5gn_wgZiMmF7sPTzh6DkfczLydnpb6cvj38yqnAKRX9-IXSQr-IjetlAHyDwAn_BXoGkkhWml3TAJL3AxLl8NOuOhYr5csuutNYeIYoHf9g0ZtWNgHQMQ0f7kw3FA4eQvN764uB7buCycIS1dduhvYEuK9R4_YP-j_gzJmtn9D4B9bNGChKuyYYQHqBfGkT-DLecOc0Ao754UtcKkCQmOPRuZXexlvC"
                  /> 
                  Google
                </button>
                <button 
                  type="button"
                  className="h-14 border-2 border-on-background flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider hover:bg-surface-container-low transition-colors"
                >
                  <Icon name="apple" className="text-xl" /> 
                  Apple
                </button>
              </div>
            </form>
          )}

          {/* Signup Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="first-name">
                    First Name
                  </label>
                  <input 
                    className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all" 
                    id="first-name" 
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="last-name">
                    Last Name
                  </label>
                  <input 
                    className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all" 
                    id="last-name" 
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="signup-email">
                  Email Address
                </label>
                <input 
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all" 
                  id="signup-email" 
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="signup-pass">
                  Create Password
                </label>
                <input 
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all" 
                  id="signup-pass" 
                  placeholder="Min. 8 characters" 
                  type="password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <p className="text-xs text-secondary leading-relaxed">
                By creating an account, you agree to our <a className="underline font-bold text-on-background hover:text-primary-container" href="#">Terms of Service</a> and <a className="underline font-bold text-on-background hover:text-primary-container" href="#">Privacy Policy</a>.
              </p>

              <button 
                className="w-full h-14 bg-on-background text-white font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-[0.98] border-b-4 border-primary-container flex items-center justify-center hover:bg-neutral-800" 
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}
