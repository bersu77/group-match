import { Timestamp } from 'firebase/firestore';

export interface JoinRequest {
  id?: string;
  groupId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  userEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

