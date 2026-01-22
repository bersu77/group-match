'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm uppercase tracking-wider animate-pulse">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-[var(--border)] bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[var(--header-mobile)] md:h-[var(--header-desktop)]">
            <div className="text-xl md:text-2xl uppercase tracking-wider">
              Group Match
            </div>
            <Link
              href="/auth"
              className="px-4 py-2 md:px-6 md:py-3 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="mb-8">
            Group Match
          </h1>
          
          <p className="text-sm md:text-base uppercase tracking-wider text-[var(--muted-foreground)] mb-4 max-w-2xl mx-auto leading-relaxed">
            Where friend groups meet friend groups
          </p>
          
          <p className="text-xs md:text-sm text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            Create a group with 2-4 friends. Discover other groups nearby. When both groups like each other, it&apos;s a match. Start chatting and making plans together.
          </p>
          
          <Link
            href="/auth"
            className="inline-block px-8 py-4 md:px-12 md:py-5 bg-[var(--foreground)] text-[var(--background)] text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
            <p>Group Match © 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
