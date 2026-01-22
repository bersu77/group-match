import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';

/**
 * Upload an image to Firebase Storage
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'groups/groupId/photo.jpg')
 * @returns The download URL of the uploaded file
 */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  try {
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const hint =
      msg.includes('CORS') || msg.includes('cors')
        ? `CORS issue: Configure your Storage bucket with storage.cors.json (see STORAGE_CORS_SETUP.md). Bucket: ${BUCKET}`
        : '';
    console.error('[Storage upload]', { path, bucket: BUCKET, error: msg, hint });
    throw new Error(hint ? `${msg} — ${hint}` : msg);
  }
};

/**
 * Delete an image from Firebase Storage
 * @param path - The storage path of the file to delete
 */
export const deleteImage = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

/**
 * Upload a group photo
 * @param file - The image file
 * @param groupId - The group ID
 * @returns The download URL
 */
export const uploadGroupPhoto = async (file: File, groupId: string): Promise<string> => {
  const timestamp = Date.now();
  const path = `groups/${groupId}/photo_${timestamp}.jpg`;
  return uploadImage(file, path);
};

/**
 * Upload a member photo
 * @param file - The image file
 * @param userId - The user ID
 * @returns The download URL
 */
export const uploadMemberPhoto = async (file: File, userId: string): Promise<string> => {
  const timestamp = Date.now();
  const path = `members/${userId}/photo_${timestamp}.jpg`;
  return uploadImage(file, path);
};

