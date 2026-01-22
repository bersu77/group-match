'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { createGroup } from '@/lib/firebase/groups';
import { uploadGroupPhoto } from '@/lib/supabase/storage';
import { GroupMember } from '@/types/group';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function CreateGroupPage() {
  return (
    <ProtectedRoute>
      <CreateGroupContent />
    </ProtectedRoute>
  );
}

function CreateGroupContent() {
  const { user } = useAuth();
  const router = useRouter();

  // Group Info
  const [groupName, setGroupName] = useState('');
  const [groupBio, setGroupBio] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!groupName.trim()) {
        throw new Error('Group name is required');
      }
      if (!groupBio.trim()) {
        throw new Error('Group bio is required');
      }

      // Create a temporary group ID
      const tempGroupId = `group_${Date.now()}`;

      // Upload group photo if exists
      let groupPhotoURL = '';
      if (groupPhoto) {
        try {
          groupPhotoURL = await uploadGroupPhoto(groupPhoto, tempGroupId);
        } catch (uploadError) {
          console.error('Error uploading group photo:', uploadError);
          // Continue without photo if upload fails
        }
      }

      // Only creator as member (no manual member management for now)
      const membersData: GroupMember[] = [
        {
          userId: user!.uid,
          name: user!.displayName || user!.email?.split('@')[0] || 'User',
          bio: '',
          photoURL: user!.photoURL || undefined,
        },
      ];

      // Create the group
      await createGroup(user!.uid, {
        name: groupName.trim(),
        bio: groupBio.trim(),
        photoURL: groupPhotoURL,
        members: membersData,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-y border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Create Group</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="mb-4">Create Group</h1>
          <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
            Create your group profile
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
          {/* Group Profile Section */}
          <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-8">
            {/* Profile Photo Upload - Instagram Style */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--border)] bg-gray-100 flex items-center justify-center">
                  {groupPhotoPreview ? (
                    <img
                      src={groupPhotoPreview}
                      alt="Group preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  )}
                </div>
                <label
                  htmlFor="group-photo"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-[var(--foreground)] rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <input
                    id="group-photo"
                    type="file"
                    accept="image/*"
                    onChange={handleGroupPhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                {groupPhotoPreview ? 'Change Photo' : 'Add Group Photo'}
              </p>
            </div>

            {/* Group Info */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-3">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-4 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors"
                  placeholder="Sunday Funday Crew"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-3">
                  Group Bio *
                </label>
                <textarea
                  value={groupBio}
                  onChange={(e) => setGroupBio(e.target.value)}
                  className="w-full px-4 py-4 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors resize-none"
                  rows={4}
                  placeholder="Tell other groups about your crew..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--foreground)] text-[var(--background)] py-4 px-6 uppercase tracking-wider text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
            <Link
              href="/dashboard"
              className="px-8 py-4 border border-[var(--border)] uppercase tracking-wider text-sm hover:border-[var(--foreground)] transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

