'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Compass,
  Heart,
  Users,
  Plus,
  Search,
  LogOut,
  ChevronDown,
  Settings,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { icon: Settings, label: 'Edit Profile', href: '/profile/edit' },
    { icon: Compass, label: 'Explore & Match', href: '/explore' },
    { icon: Heart, label: 'Matches', href: '/matches' },
    { icon: Users, label: 'My Groups', href: '/groups/my-groups' },
    { icon: Plus, label: 'Create Group', href: '/groups/create' },
    { icon: Search, label: 'Find Groups to Join', href: '/groups/browse' },
  ];

  return (
    <nav className="border-b border-[var(--border)] bg-white/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="text-xl md:text-2xl uppercase tracking-wider hover:opacity-70 transition-opacity">
            Group Match
          </Link>
          
          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] hover:border-[var(--foreground)] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center overflow-hidden">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <span className="hidden sm:inline text-xs uppercase tracking-wider">
                {user?.displayName || user?.email?.split('@')[0]}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[var(--border)] shadow-lg z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="text-sm font-medium truncate">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                      <span className="uppercase tracking-wider text-xs">{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Logout */}
                <div className="border-t border-[var(--border)] py-2">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-50 text-red-600 w-full transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="uppercase tracking-wider text-xs">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

