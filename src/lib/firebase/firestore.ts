import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Generic function to create a document
 */
export const createDocument = async <T extends Record<string, unknown>>(
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> => {
  const docRef = doc(db, collectionName, documentId);
  await setDoc(docRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

/**
 * Generic function to get a document by ID
 */
export const getDocument = async <T = DocumentData>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

/**
 * Generic function to update a document
 */
export const updateDocument = async <T extends Record<string, unknown>>(
  collectionName: string,
  documentId: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Generic function to delete a document
 */
export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  const docRef = doc(db, collectionName, documentId);
  await deleteDoc(docRef);
};

/**
 * Generic function to get all documents from a collection
 */
export const getCollection = async <T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> => {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
};

/**
 * Helper functions for common query patterns
 */
export const getDocumentsByField = async <T = DocumentData>(
  collectionName: string,
  field: string,
  value: string | number | boolean,
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<T[]> => {
  const constraints: QueryConstraint[] = [where(field, '==', value)];
  if (orderByField) {
    constraints.push(orderBy(orderByField, orderDirection));
  }
  return getCollection<T>(collectionName, constraints);
};

/**
 * Example usage types for common collections
 */
export interface UserDocument {
  id?: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

