import { supabase } from './client';

const BUCKET = 'group-photos';

/**
 * Upload an image to Supabase Storage and return the public URL.
 * Returns empty string if Supabase is not configured.
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  if (!supabase) {
    console.warn('[Supabase Storage] Not configured - skipping upload. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
    return '';
  }

  console.log('[Supabase Storage] Uploading...', { path, fileName: file.name, size: file.size });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[Supabase Storage] Upload failed', { path, error: error.message });
    throw new Error(error.message);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  console.log('[Supabase Storage] Upload successful', { path, url: urlData.publicUrl });

  return urlData.publicUrl;
}

/**
 * Upload a group photo. Returns public URL or empty string.
 */
export async function uploadGroupPhoto(file: File, groupId: string): Promise<string> {
  const path = `groups/${groupId}/photo_${Date.now()}.jpg`;
  return uploadImage(file, path);
}

/**
 * Upload a member photo. Returns public URL or empty string.
 */
export async function uploadMemberPhoto(file: File, userId: string): Promise<string> {
  const path = `members/${userId}/photo_${Date.now()}.jpg`;
  return uploadImage(file, path);
}

