'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { uploadImage } from '@/lib/supabase/storage';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function StorageDebugPage() {
  return (
    <ProtectedRoute>
      <StorageDebugContent />
    </ProtectedRoute>
  );
}

function StorageDebugContent() {
  const { logout } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);

  const supabaseConfigured = isSupabaseConfigured();
  const hasEnvVars = {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const testPath = `debug/test_${Date.now()}_${file.name}`;
      console.log('[Debug] Starting upload...', { path: testPath, fileName: file.name, size: file.size });
      
      const url = await uploadImage(file, testPath);
      
      if (url) {
        setResult({
          success: true,
          message: 'Upload successful! ✅',
          url,
        });
        console.log('[Debug] Upload success!', { url });
      } else {
        setResult({
          success: false,
          message: 'Upload returned empty URL (Supabase not configured)',
        });
        console.warn('[Debug] Upload returned empty URL');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({
        success: false,
        message: `Upload failed: ${errorMessage}`,
      });
      console.error('[Debug] Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-mono hover:opacity-70 transition-opacity">
              ← Back to Dashboard
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white text-xs uppercase tracking-wider hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-mono mb-2">🔍 Storage Debug</h1>
          <p className="text-gray-400 font-mono text-sm">Test Supabase Storage configuration</p>
        </div>

        {/* Configuration Status */}
        <div className="bg-gray-800 border border-gray-700 p-6 mb-6 font-mono">
          <h2 className="text-xl mb-4">📋 Configuration Status</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className={hasEnvVars.url ? 'text-green-400' : 'text-red-400'}>
                {hasEnvVars.url ? '✓' : '✗'}
              </span>
              <span>NEXT_PUBLIC_SUPABASE_URL</span>
              <code className="ml-auto text-xs text-gray-500">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}
              </code>
            </div>

            <div className="flex items-center gap-3">
              <span className={hasEnvVars.key ? 'text-green-400' : 'text-red-400'}>
                {hasEnvVars.key ? '✓' : '✗'}
              </span>
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              <code className="ml-auto text-xs text-gray-500">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'eyJ...' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-20) : 'NOT SET'}
              </code>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-700">
              <span className={supabaseConfigured ? 'text-green-400' : 'text-red-400'}>
                {supabaseConfigured ? '✓' : '✗'}
              </span>
              <span className="font-bold">Supabase Client</span>
              <span className="ml-auto">
                {supabaseConfigured ? (
                  <span className="text-green-400">READY</span>
                ) : (
                  <span className="text-red-400">NOT CONFIGURED</span>
                )}
              </span>
            </div>
          </div>

          {!supabaseConfigured && (
            <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded">
              <p className="text-yellow-400 text-sm">
                ⚠️ Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the server.
              </p>
            </div>
          )}
        </div>

        {/* Upload Test */}
        <div className="bg-gray-800 border border-gray-700 p-6 mb-6">
          <h2 className="text-xl mb-4 font-mono">🧪 Test Upload</h2>

          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm mb-2 font-mono">Select Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
            </div>

            {/* Preview */}
            {preview && (
              <div>
                <p className="text-sm mb-2 font-mono">Preview:</p>
                <img src={preview} alt="Preview" className="max-w-xs border border-gray-700" />
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  File: {file?.name} ({(file?.size || 0 / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading || !supabaseConfigured}
              className="w-full px-6 py-3 bg-blue-600 text-white font-mono uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : !supabaseConfigured ? 'Configure Supabase First' : 'Test Upload'}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`border p-6 font-mono ${result.success ? 'bg-green-900/30 border-green-600' : 'bg-red-900/30 border-red-600'}`}>
            <h2 className="text-xl mb-4">
              {result.success ? '✅ Result: SUCCESS' : '❌ Result: FAILED'}
            </h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">Message:</p>
                <p className={result.success ? 'text-green-400' : 'text-red-400'}>
                  {result.message}
                </p>
              </div>

              {result.url && (
                <>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">URL:</p>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline text-xs break-all"
                    >
                      {result.url}
                    </a>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-2">Uploaded Image:</p>
                    <img
                      src={result.url}
                      alt="Uploaded"
                      className="max-w-md border border-gray-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const error = document.createElement('p');
                          error.className = 'text-red-400 text-sm';
                          error.textContent = 'Failed to load image (check bucket permissions)';
                          parent.appendChild(error);
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 bg-gray-800 border border-gray-700 font-mono text-sm">
          <h3 className="text-lg mb-3">📖 Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li>Create a Supabase project at <a href="https://supabase.com" className="text-blue-400 underline" target="_blank">supabase.com</a></li>
            <li>Get your Project URL and anon key from Settings → API</li>
            <li>Add them to <code className="text-yellow-400">.env.local</code></li>
            <li>Create a bucket named <code className="text-yellow-400">group-photos</code> in Storage (make it public)</li>
            <li>Restart dev server: <code className="text-yellow-400">npm run dev</code></li>
            <li>Come back here and test upload</li>
          </ol>
        </div>

        {/* Console Logs */}
        <div className="mt-8 p-6 bg-gray-950 border border-gray-800">
          <p className="text-sm text-gray-400 font-mono">
            💡 Open browser console (F12) to see detailed logs
          </p>
        </div>
      </main>
    </div>
  );
}


