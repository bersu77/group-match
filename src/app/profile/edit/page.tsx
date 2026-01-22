'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { updateProfile } from 'firebase/auth';
import { uploadMemberPhoto } from '@/lib/supabase/storage';
import { syncUserProfileToGroups } from '@/lib/firebase/syncUserProfile';
import { Upload } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function EditProfilePage() {
  return (
    <ProtectedRoute>
      <EditProfileContent />
    </ProtectedRoute>
  );
}

function EditProfileContent() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
      setPhotoPreview(user.photoURL || '');
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerPhotoUpload = () => {
    document.getElementById('profile-photo-input')?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let uploadedPhotoURL = photoURL;

      // Upload photo if a new one was selected
      if (photoFile) {
        uploadedPhotoURL = await uploadMemberPhoto(photoFile, user.uid);
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName.trim() || null,
        photoURL: uploadedPhotoURL || null,
      });

      // Sync profile to all groups (creator and member)
      await syncUserProfileToGroups(
        user.uid,
        displayName.trim() || user.displayName || user.email?.split('@')[0] || 'User',
        uploadedPhotoURL || null
      );

      setSuccess('Profile updated successfully!');
      // Don't redirect - stay on the page
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile.';
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
                <BreadcrumbPage>Edit Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="mb-4">Edit Profile</h1>
          <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
            Update your profile information
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm uppercase tracking-wider mb-4">
              Profile Photo
            </label>
            <div className="flex flex-col items-center gap-4">
              <div 
                className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--border)] flex items-center justify-center bg-gray-100 cursor-pointer group"
                onClick={triggerPhotoUpload}
              >
                {photoPreview ? (
                  <>
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-xs text-gray-500">Click to upload</span>
                  </div>
                )}
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                Click the circle to upload a photo<br />
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors"
              placeholder="Enter your display name"
            />
          </div>

          {/* Email (Read Only) */}
          <div>
            <label className="block text-sm uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-not-allowed"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Email cannot be changed
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[var(--foreground)] text-[var(--background)] text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 px-6 py-3 border border-[var(--border)] text-[var(--foreground)] text-sm uppercase tracking-wider hover:border-[var(--foreground)] transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

