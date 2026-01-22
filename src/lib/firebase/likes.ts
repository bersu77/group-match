import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { GroupLike } from '@/types/like';
import { createMatch, checkIfMatch } from './matches';

/**
 * Like a group (swipe right)
 */
export const likeGroup = async (
  fromGroupId: string,
  toGroupId: string
): Promise<{ liked: boolean; matched: boolean; matchId?: string }> => {
  const likesRef = collection(db, 'likes');
  const newLikeRef = doc(likesRef);

  const like: Omit<GroupLike, 'id'> = {
    fromGroupId,
    toGroupId,
    createdAt: Timestamp.now(),
  };

  await setDoc(newLikeRef, like);

  // Check if the other group also liked this group (creating a match)
  const isMatch = await checkIfMatch(fromGroupId, toGroupId);
  
  if (isMatch) {
    const matchId = await createMatch(fromGroupId, toGroupId);
    return { liked: true, matched: true, matchId };
  }

  return { liked: true, matched: false };
};

/**
 * Check if a group has already liked another group
 */
export const hasLikedGroup = async (
  fromGroupId: string,
  toGroupId: string
): Promise<boolean> => {
  const likesRef = collection(db, 'likes');
  const q = query(
    likesRef,
    where('fromGroupId', '==', fromGroupId),
    where('toGroupId', '==', toGroupId)
  );

  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

/**
 * Get all groups that a specific group has liked
 */
export const getLikedGroups = async (groupId: string): Promise<string[]> => {
  const likesRef = collection(db, 'likes');
  const q = query(likesRef, where('fromGroupId', '==', groupId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data().toGroupId);
};

/**
 * Get all groups that liked a specific group
 */
export const getGroupsWhoLiked = async (groupId: string): Promise<string[]> => {
  const likesRef = collection(db, 'likes');
  const q = query(likesRef, where('toGroupId', '==', groupId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data().fromGroupId);
};

