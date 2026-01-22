import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
  or,
  and,
} from 'firebase/firestore';
import { db } from './config';
import { GroupMatch } from '@/types/match';
import { createChatRoom } from './chat';

/**
 * Check if two groups have matched (both liked each other)
 */
export const checkIfMatch = async (
  groupId1: string,
  groupId2: string
): Promise<boolean> => {
  const likesRef = collection(db, 'likes');
  
  // Check if groupId2 has liked groupId1
  const q = query(
    likesRef,
    where('fromGroupId', '==', groupId2),
    where('toGroupId', '==', groupId1)
  );

  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

/**
 * Create a match between two groups and auto-create chat room
 */
export const createMatch = async (
  groupId1: string,
  groupId2: string
): Promise<string> => {
  const matchesRef = collection(db, 'matches');
  const newMatchRef = doc(matchesRef);

  const match: Omit<GroupMatch, 'id'> = {
    groupId1,
    groupId2,
    matchedAt: Timestamp.now(),
  };

  await setDoc(newMatchRef, match);
  
  // Automatically create a chat room for this match
  try {
    const chatRoomId = await createChatRoom(newMatchRef.id, groupId1, groupId2);
    console.log(`Chat room created: ${chatRoomId} for match: ${newMatchRef.id}`);
  } catch (error) {
    console.error('Error creating chat room:', error);
    // Don't fail the match if chat room creation fails
  }

  return newMatchRef.id;
};

/**
 * Get all matches for a group
 */
export const getGroupMatches = async (groupId: string): Promise<GroupMatch[]> => {
  const matchesRef = collection(db, 'matches');
  
  // Query for matches where the group is either groupId1 or groupId2
  const q = query(
    matchesRef,
    or(
      where('groupId1', '==', groupId),
      where('groupId2', '==', groupId)
    )
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as GroupMatch[];
};

/**
 * Check if two groups are already matched
 */
export const areGroupsMatched = async (
  groupId1: string,
  groupId2: string
): Promise<boolean> => {
  const matchesRef = collection(db, 'matches');
  
  const q = query(
    matchesRef,
    or(
      and(
        where('groupId1', '==', groupId1),
        where('groupId2', '==', groupId2)
      ),
      and(
        where('groupId1', '==', groupId2),
        where('groupId2', '==', groupId1)
      )
    )
  );

  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

