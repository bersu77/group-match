import { Timestamp } from 'firebase/firestore';

export interface GroupMember {
  userId: string;
  name: string;
  photoURL?: string;
  bio?: string;
}

export interface Group {
  id?: string;
  name: string;
  bio: string;
  photoURL?: string;
  createdBy: string;
  members: GroupMember[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isActive: boolean;
}

export interface CreateGroupData {
  name: string;
  bio: string;
  photoURL?: string;
  members: GroupMember[];
}

