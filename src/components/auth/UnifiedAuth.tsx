'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { login, register, loginWithGoogle, checkEmailExists, subscribeToAuthChanges, getUserProfile } from '@/lib/api/auth';
import { syncLocalCartToFirestore } from '@/lib/api/cart';
import Icon from '@/components/Icon';

interface UnifiedAuthProps {
  initialTab?: 'login' | 'signup';
}

export default function UnifiedAuth({ initialTab = 'login' }: UnifiedAuthProps) {
  const [step, setStep] = useState<'email' | 'login' | 'signup'>('email');
  
  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'merchant'>('customer');
  const [rememberMe, setRememberMe] = useState(false);

  // Status fields
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            const userRole = profile.role || 'customer';
            if (userRole === 'admin') {
              window.location.href = '/admin';
            } else if (userRole === 'merchant') {
              window.location.href = '/merchant';
            } else {
              window.location.href = '/products';
            }
          }
        } catch (error) {
          console.error("Error fetching profile for redirect", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setSubmitting(true);
    try {
      const exists = await checkEmailExists(email);
      if (exists) {
        setStep('login');
      } else {
        setStep('signup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      await syncLocalCartToFirestore(user.uid);
      
      const userRole = (user as any).role || 'customer';
      if (userRole === 'admin') {
        window.location.href = '/admin';
      } else if (userRole === 'merchant') {
        window.location.href = '/merchant';
      } else {
        window.location.href = '/products';
      }
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
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: role
      });
      await syncLocalCartToFirestore(user.uid);
      
      const userRole = (user as any).role || 'customer';
      if (userRole === 'admin') {
        window.location.href = '/admin';
      } else if (userRole === 'merchant') {
        window.location.href = '/merchant';
      } else {
        window.location.href = '/products';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center py-20 px-4 md:px-16 min-h-[calc(100vh-140px)]">
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 border-on-background overflow-hidden bg-surface">
        
        {/* Left Side: Premium Brand Information Panel */}
        <div className="order-2 lg:order-1 relative bg-on-background text-surface flex flex-col justify-center p-12 lg:p-16 space-y-6 min-h-[400px]">
          <div className="absolute inset-0 opacity-20">
            <img 
              alt="Cinematic, high-contrast action shot of a professional athlete" 
              className="w-full h-full object-contain mix-blend-multiply" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaOgHlt0Cg_WYRrCQpaY2sqn2VTje6_8X0JjvFZuLmWeBdQ48eiFBQFM5c8dCt1MR5Iy_7xMuEzhlKIn4WVT-rGnzXRY9fKDGcQmzpurc3fN9kHBGuOCARP2mWiqnGHDoIvBukvH73njMt2Rhc6V3ZPo1TCwR-Pvs7_rBuC4Ort0AjXGG6w6yS7wDRfR3PFR6IWuGVuXt5PzNNZiUFIU_G38nWzBj0euxmIH3nfAme8hBxz4Jw51A-gbk0cRCTeNTwsVrjRZcqvUo3"
            />
          </div>
          <div className="relative z-10">
            <span className="inline-block bg-primary-container text-on-primary-container font-extrabold text-[10px] md:text-xs px-2 py-1 md:px-3 md:py-1 mb-4 uppercase tracking-widest">
              Join Us
            </span>
            <h1 className="font-headline-md text-2xl md:text-4xl font-black mb-4 md:mb-6 leading-tight uppercase tracking-tight text-white">
              Member Access Only.
            </h1>
            <p className="font-body-md text-xs md:text-base text-surface-container max-w-[400px] mb-6 md:mb-8 leading-relaxed text-gray-300">
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

        {/* Right Side: Step-by-Step Form Panel */}
        <div className="order-1 lg:order-2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-surface min-h-[550px]">
          {/* Header Area depending on step */}
          <div className="mb-8">
            {step === 'email' && (
              <>
                <h2 className="font-headline-md text-xl md:text-2xl font-black uppercase text-on-background mb-2">Welcome</h2>
                <p className="text-secondary text-xs md:text-sm">Enter your email to sign in or create an account.</p>
              </>
            )}
            {step === 'login' && (
              <>
                <h2 className="font-headline-md text-xl md:text-2xl font-black uppercase text-on-background mb-2">Welcome Back</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-bold text-xs md:text-sm text-secondary">{email}</span>
                  <button type="button" onClick={() => setStep('email')} className="text-[10px] md:text-xs uppercase font-bold text-primary-container hover:underline">Edit</button>
                </div>
                <p className="text-secondary text-xs md:text-sm">Please enter your password to continue.</p>
              </>
            )}
            {step === 'signup' && (
              <>
                <h2 className="font-headline-md text-xl md:text-2xl font-black uppercase text-on-background mb-2">Create Account</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-bold text-xs md:text-sm text-secondary">{email}</span>
                  <button type="button" onClick={() => setStep('email')} className="text-[10px] md:text-xs uppercase font-bold text-primary-container hover:underline">Edit</button>
                </div>
                <p className="text-secondary text-xs md:text-sm">It looks like you are new here. Let's get you set up.</p>
              </>
            )}
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="p-4 mb-6 bg-error-container border-2 border-error text-on-error-container font-semibold text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="email">
                  Email Address
                </label>
                <input 
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all bg-surface text-on-surface" 
                  id="email" 
                  placeholder="name@domain.com" 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <button 
                className="w-full h-14 bg-on-background text-background font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-[0.98] border-b-4 border-primary-container flex items-center justify-center hover:bg-neutral-800" 
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Checking...' : 'Continue'}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-container-highest"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-3 text-secondary font-bold tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              <button 
                type="button"
                onClick={async () => {
                  try {
                    setError('');
                    setSubmitting(true);
                    const user = await loginWithGoogle();
                    await syncLocalCartToFirestore(user.uid);
                    
                    const userRole = (user as any).role || 'customer';
                    if (userRole === 'admin') {
                      window.location.href = '/admin';
                    } else if (userRole === 'merchant') {
                      window.location.href = '/merchant';
                    } else {
                      window.location.href = '/products';
                    }
                  } catch (err: any) {
                    setError(err.message || 'Google sign-in failed');
                    setSubmitting(false);
                  }
                }}
                className="w-full h-14 border-2 border-on-background flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider hover:bg-surface-container-low transition-colors"
              >
                <img 
                  alt="Google Logo" 
                  className="w-5 h-5" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHqgSvWFI7jZB6h0SWvxr8akP6MOaQzMARZ79KLaV_2CiWI5gn_wgZiMmF7sPTzh6DkfczLydnpb6cvj38yqnAKRX9-IXSQr-IjetlAHyDwAn_BXoGkkhWml3TAJL3AxLl8NOuOhYr5csuutNYeIYoHf9g0ZtWNgHQMQ0f7kw3FA4eQvN764uB7buCycIS1dduhvYEuK9R4_YP-j_gzJmtn9D4B9bNGChKuyYYQHqBfGkT-DLecOc0Ao754UtcKkCQmOPRuZXexlvC"
                /> 
                Google
              </button>
            </form>
          )}

          {/* Step 2A: Login Form */}
          {step === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
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
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all bg-surface text-on-surface" 
                  id="login-pass" 
                  placeholder="••••••••" 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
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
            </form>
          )}

          {/* Step 2B: Signup Form */}
          {step === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="first-name">
                    First Name
                  </label>
                  <input 
                    className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all bg-surface text-on-surface" 
                    id="first-name" 
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="last-name">
                    Last Name
                  </label>
                  <input 
                    className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all bg-surface text-on-surface" 
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
                <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="phone">
                  Phone Number
                </label>
                <input 
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all bg-surface text-on-surface" 
                  id="phone" 
                  placeholder="e.g. +254 700 000 000" 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-xs tracking-wider block text-on-background uppercase" htmlFor="signup-pass">
                  Create Password
                </label>
                <input 
                  className="w-full h-14 px-4 border border-on-background rounded-none font-medium transition-all bg-surface text-on-surface" 
                  id="signup-pass" 
                  placeholder="Min. 8 characters" 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="font-bold text-xs tracking-wider block text-on-background uppercase">
                  Account Type
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="role" 
                      value="customer" 
                      checked={role === 'customer'} 
                      onChange={() => setRole('customer')}
                      className="w-4 h-4 accent-on-background cursor-pointer"
                    />
                    <span className="text-sm font-medium uppercase tracking-wide">Customer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="role" 
                      value="merchant" 
                      checked={role === 'merchant'} 
                      onChange={() => setRole('merchant')}
                      className="w-4 h-4 accent-on-background cursor-pointer"
                    />
                    <span className="text-sm font-medium uppercase tracking-wide">Merchant</span>
                  </label>
                </div>
              </div>

              <p className="text-xs text-secondary leading-relaxed">
                By creating an account, you agree to our <Link className="underline font-bold text-on-background hover:text-primary-container" href="/terms">Terms of Service</Link> and <Link className="underline font-bold text-on-background hover:text-primary-container" href="/privacy">Privacy Policy</Link>.
              </p>

              <button 
                className="w-full h-14 bg-on-background text-background font-headline-md font-bold uppercase tracking-wider text-sm transition-all active:scale-[0.98] border-b-4 border-primary-container flex items-center justify-center hover:bg-neutral-800" 
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

