import { Timestamp } from 'firebase/firestore';

export interface ChatRoom {
  id?: string;
  matchId: string;
  groupId1: string;
  groupId2: string;
  group1Name: string;
  group2Name: string;
  memberIds: string[]; // All members from both groups
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  lastMessage?: string;
}

export interface ChatMessage {
  id?: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: Timestamp;
}

