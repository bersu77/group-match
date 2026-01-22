import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { Group } from '@/types/group';

/**
 * Clean member object to remove undefined values (Firestore doesn't accept undefined)
 */
const cleanMemberData = (member: { userId: string; name: string; bio?: string; photoURL?: string }): Record<string, string> => {
  const clean: Record<string, string> = {
    userId: member.userId,
    name: member.name,
  };
  if (member.bio) clean.bio = member.bio;
  if (member.photoURL) clean.photoURL = member.photoURL;
  return clean;
};

/**
 * Sync user profile across all their groups (creator and member)
 * This ensures the user's display name and photo are up-to-date everywhere
 */
export const syncUserProfileToGroups = async (
  userId: string,
  displayName: string,
  photoURL: string | null
): Promise<void> => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('isActive', '==', true));
  const querySnapshot = await getDocs(q);

  const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
    const group = { id: docSnapshot.id, ...docSnapshot.data() } as Group;
    
    // Check if user is a member
    const memberIndex = group.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) return; // User not in this group

    // Update the member's data, cleaning undefined values
    const updatedMembers = group.members.map((member, idx) => {
      if (idx !== memberIndex) return cleanMemberData(member);
      
      // Build updated member without undefined values
      const updated: Record<string, string> = {
        userId: member.userId,
        name: displayName,
      };
      if (member.bio) updated.bio = member.bio;
      if (photoURL) {
        updated.photoURL = photoURL;
      }
      // Don't include photoURL if it's null/empty - this removes the photo
      return updated;
    });

    // Update the group document
    await updateDoc(doc(db, 'groups', group.id!), {
      members: updatedMembers,
      updatedAt: Timestamp.now(),
    });
  });

  await Promise.all(updatePromises);
};

