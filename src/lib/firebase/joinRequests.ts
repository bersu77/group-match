import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { JoinRequest } from '@/types/joinRequest';
import { addMemberToGroup } from './groups';
import { GroupMember } from '@/types/group';

/**
 * Create a join request
 */
export const createJoinRequest = async (
  groupId: string,
  userId: string,
  userName: string,
  userEmail?: string,
  userPhotoURL?: string
): Promise<string> => {
  const requestsRef = collection(db, 'joinRequests');
  const newRequestRef = doc(requestsRef);

  // Build request object, excluding undefined values (Firestore doesn't accept undefined)
  const request: Record<string, string | Timestamp> = {
    groupId,
    userId,
    userName,
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Only add optional fields if they have values
  if (userEmail) {
    request.userEmail = userEmail;
  }
  if (userPhotoURL) {
    request.userPhotoURL = userPhotoURL;
  }

  await setDoc(newRequestRef, request);
  return newRequestRef.id;
};

/**
 * Get all join requests for a group
 * Note: Filtering by status and sorting done in JS to avoid composite index requirements
 */
export const getGroupJoinRequests = async (
  groupId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<JoinRequest[]> => {
  const requestsRef = collection(db, 'joinRequests');
  
  // Simple query - just filter by groupId
  const q = query(requestsRef, where('groupId', '==', groupId));
  const querySnapshot = await getDocs(q);

  let results = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as JoinRequest[];

  // Filter by status in JavaScript if needed
  if (status) {
    results = results.filter((r) => r.status === status);
  }

  // Sort by createdAt descending in JavaScript
  results.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

  return results;
};

/**
 * Get all join requests by a user
 * Note: Filtering by status and sorting done in JS to avoid composite index requirements
 */
export const getUserJoinRequests = async (
  userId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<JoinRequest[]> => {
  const requestsRef = collection(db, 'joinRequests');
  
  // Simple query - just filter by userId
  const q = query(requestsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  let results = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as JoinRequest[];

  // Filter by status in JavaScript if needed
  if (status) {
    results = results.filter((r) => r.status === status);
  }

  // Sort by createdAt descending in JavaScript
  results.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

  return results;
};

/**
 * Check if user has a pending request for a group
 * Note: Uses simple query + JS filtering to avoid composite index requirements
 */
export const hasPendingRequest = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  const requestsRef = collection(db, 'joinRequests');
  
  // Simple query by groupId, then filter in JS
  const q = query(requestsRef, where('groupId', '==', groupId));
  const querySnapshot = await getDocs(q);

  // Filter for this user's pending requests in JavaScript
  return querySnapshot.docs.some((doc) => {
    const data = doc.data();
    return data.userId === userId && data.status === 'pending';
  });
};

/**
 * Approve a join request
 */
export const approveJoinRequest = async (
  requestId: string
): Promise<void> => {
  const requestRef = doc(db, 'joinRequests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Join request not found');
  }

  const request = { id: requestSnap.id, ...requestSnap.data() } as JoinRequest;

  if (request.status !== 'pending') {
    throw new Error('Request has already been processed');
  }

  // Add the user to the group
  const newMember: GroupMember = {
    userId: request.userId,
    name: request.userName,
    bio: '',
    photoURL: request.userPhotoURL,
  };

  await addMemberToGroup(request.groupId, newMember);

  // Update the request status
  await updateDoc(requestRef, {
    status: 'approved',
    updatedAt: Timestamp.now(),
  });
};

/**
 * Reject a join request
 */
export const rejectJoinRequest = async (requestId: string): Promise<void> => {
  const requestRef = doc(db, 'joinRequests', requestId);
  await updateDoc(requestRef, {
    status: 'rejected',
    updatedAt: Timestamp.now(),
  });
};

/**
 * Cancel a join request (by the requester)
 */
export const cancelJoinRequest = async (requestId: string): Promise<void> => {
  const requestRef = doc(db, 'joinRequests', requestId);
  await updateDoc(requestRef, {
    status: 'rejected',
    updatedAt: Timestamp.now(),
  });
};

