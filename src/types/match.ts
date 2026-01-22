import { Timestamp } from 'firebase/firestore';

export interface GroupMatch {
  id?: string;
  groupId1: string;
  groupId2: string;
  matchedAt: Timestamp;
  chatId?: string; // For future chat functionality
}

