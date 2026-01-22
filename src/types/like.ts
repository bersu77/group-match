import { Timestamp } from 'firebase/firestore';

export interface GroupLike {
  id?: string;
  fromGroupId: string; // The group that is liking
  toGroupId: string;   // The group being liked
  createdAt: Timestamp;
}

