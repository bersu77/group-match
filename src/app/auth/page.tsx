'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!email || !password) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (isSignUp) {
        await signUp(email, password, displayName || undefined);
      } else {
        await signIn(email, password);
      }

      // Redirect to dashboard after successful authentication
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center px-4 overflow-y-auto">
      <div className="w-full max-w-lg my-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-none border border-[var(--border)] p-8 md:p-12 shadow-sm">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl mb-4">
              {isSignUp ? 'Join Us' : 'Welcome Back'}
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm uppercase tracking-wider">
              {isSignUp
                ? 'Create your account'
                : 'Sign in to your account'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-xs uppercase tracking-wider mb-3 text-[var(--foreground)]"
                >
                  Display Name (Optional)
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-4 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors text-[var(--foreground)]"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-wider mb-3 text-[var(--foreground)]"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-4 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors text-[var(--foreground)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-wider mb-3 text-[var(--foreground)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-4 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors text-[var(--foreground)]"
                placeholder="••••••••"
              />
              {isSignUp && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)] uppercase tracking-wider">
                  Minimum 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--foreground)] text-[var(--background)] py-4 px-6 uppercase tracking-wider text-sm font-normal hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : isSignUp
                ? 'Join Now'
                : 'Sign In'}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setPassword('');
              }}
              className="mt-3 text-sm uppercase tracking-wider text-[var(--foreground)] hover:opacity-70 transition-opacity underline"
            >
              {isSignUp ? 'Sign In Instead' : 'Join Now'}
            </button>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          <p>Secure Authentication</p>
        </div>
      </div>
    </div>
  );
}

