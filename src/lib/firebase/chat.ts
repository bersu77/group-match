import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { ChatRoom, ChatMessage } from '@/types/chat';
import { getGroup } from './groups';

/**
 * Create a chat room for a match
 */
export const createChatRoom = async (
  matchId: string,
  groupId1: string,
  groupId2: string
): Promise<string> => {
  const chatRoomsRef = collection(db, 'chatRooms');
  const newChatRoomRef = doc(chatRoomsRef);

  // Get both groups to get member lists
  const [group1, group2] = await Promise.all([
    getGroup(groupId1),
    getGroup(groupId2),
  ]);

  if (!group1 || !group2) {
    throw new Error('Groups not found');
  }

  // Merge all member IDs from both groups
  const memberIds = [
    ...group1.members.map((m) => m.userId),
    ...group2.members.map((m) => m.userId),
  ];

  const chatRoom: Omit<ChatRoom, 'id'> = {
    matchId,
    groupId1,
    groupId2,
    group1Name: group1.name,
    group2Name: group2.name,
    memberIds,
    createdAt: Timestamp.now(),
  };

  await setDoc(newChatRoomRef, chatRoom);
  return newChatRoomRef.id;
};

/**
 * Get chat room by match ID
 */
export const getChatRoomByMatchId = async (
  matchId: string
): Promise<ChatRoom | null> => {
  const chatRoomsRef = collection(db, 'chatRooms');
  const q = query(chatRoomsRef, where('matchId', '==', matchId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ChatRoom;
};

/**
 * Get chat room by ID
 */
export const getChatRoom = async (chatRoomId: string): Promise<ChatRoom | null> => {
  const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
  const chatRoomSnap = await getDoc(chatRoomRef);

  if (chatRoomSnap.exists()) {
    return { id: chatRoomSnap.id, ...chatRoomSnap.data() } as ChatRoom;
  }
  return null;
};

/**
 * Get all chat rooms for a user
 */
export const getUserChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  const chatRoomsRef = collection(db, 'chatRooms');
  const q = query(chatRoomsRef, where('memberIds', 'array-contains', userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatRoom[];
};

/**
 * Send a message in a chat room
 */
export const sendMessage = async (
  chatRoomId: string,
  senderId: string,
  senderName: string,
  message: string
): Promise<string> => {
  const messagesRef = collection(db, 'messages');

  const newMessage: Omit<ChatMessage, 'id'> = {
    chatRoomId,
    senderId,
    senderName,
    message: message.trim(),
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(messagesRef, newMessage);

  // Update chat room's last message
  const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
  await updateDoc(chatRoomRef, {
    lastMessageAt: Timestamp.now(),
    lastMessage: message.trim(),
  });

  return docRef.id;
};

/**
 * Get messages for a chat room
 */
export const getChatMessages = async (
  chatRoomId: string,
  limitCount: number = 50
): Promise<ChatMessage[]> => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('chatRoomId', '==', chatRoomId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const querySnapshot = await getDocs(q);

  const messages = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatMessage[];

  // Return in ascending order (oldest first)
  return messages.reverse();
};

