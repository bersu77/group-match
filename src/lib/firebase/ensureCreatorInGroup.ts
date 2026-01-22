import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { Group } from '@/types/group';
import { User } from 'firebase/auth';

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
 * Ensure the creator is included in the group members array with their current profile
 * This fixes groups where the creator might not be in the members array
 */
export const ensureCreatorInGroupMembers = async (
  groupId: string,
  creator: User
): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) return;

  const group = { id: groupSnap.id, ...groupSnap.data() } as Group;
  
  // Check if creator is already in members array
  const creatorIndex = group.members.findIndex(m => m.userId === creator.uid);
  const creatorName = creator.displayName || creator.email?.split('@')[0] || 'User';
  
  if (creatorIndex === -1) {
    // Creator not in members, add them (clean all existing members too)
    const creatorMember: Record<string, string> = {
      userId: creator.uid,
      name: creatorName,
    };
    if (creator.photoURL) {
      creatorMember.photoURL = creator.photoURL;
    }
    
    const cleanedMembers = group.members.map(cleanMemberData);
    
    await updateDoc(groupRef, {
      members: [...cleanedMembers, creatorMember],
      updatedAt: Timestamp.now(),
    });
  } else {
    // Creator is in members, update their info (clean all members)
    const updatedMembers = group.members.map((member, idx) => {
      if (idx !== creatorIndex) return cleanMemberData(member);
      
      const updated: Record<string, string> = {
        userId: creator.uid,
        name: creatorName,
      };
      if (member.bio) updated.bio = member.bio;
      if (creator.photoURL) {
        updated.photoURL = creator.photoURL;
      }
      return updated;
    });
    
    await updateDoc(groupRef, {
      members: updatedMembers,
      updatedAt: Timestamp.now(),
    });
  }
};

/**
 * Batch ensure creator is in all their groups
 */
export const ensureCreatorInAllGroups = async (
  groups: Group[],
  creator: User
): Promise<void> => {
  const creatorGroups = groups.filter(g => g.createdBy === creator.uid);
  
  await Promise.all(
    creatorGroups.map(group => ensureCreatorInGroupMembers(group.id!, creator))
  );
};

