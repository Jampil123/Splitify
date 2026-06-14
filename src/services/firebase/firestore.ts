import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    db,
    deleteDoc,
    doc,
    DocumentData,
    DocumentReference,
    getDoc,
    getDocs,
    increment,
    query,
    QueryConstraint,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    writeBatch
} from './config';

// ============ Generic CRUD Operations ============

// Get document by ID
export async function getDocument<T extends Record<string, any>>(
  collectionName: string,
  documentId: string
): Promise<(T & { id: string }) | null> {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
    }
    return null;
  } catch (error) {
    console.error(`Error getting document ${collectionName}/${documentId}:`, error);
    return null;
  }
}

// Get collection with constraints
export async function getCollection<T extends Record<string, any>>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T & { id: string });
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    return [];
  }
}

// Get subcollection documents
export async function getSubcollection<T extends Record<string, any>>(
  parentPath: string,
  subcollectionName: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  try {
    const subcollectionRef = collection(db, `${parentPath}/${subcollectionName}`);
    const q = constraints.length > 0 ? query(subcollectionRef, ...constraints) : subcollectionRef;
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T & { id: string });
  } catch (error) {
    console.error(`Error getting subcollection ${parentPath}/${subcollectionName}:`, error);
    return [];
  }
}

// Add document with auto-generated ID
export async function addDocument<T extends Record<string, any>>(
  collectionName: string,
  data: T
): Promise<string | null> {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    return null;
  }
}

// Add document with custom ID
export async function setDocument<T extends Record<string, any>>(
  collectionName: string,
  documentId: string,
  data: T
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error(`Error setting document ${collectionName}/${documentId}:`, error);
    return false;
  }
}

// Update document
export async function updateDocument<T extends Record<string, any>>(
  collectionName: string,
  documentId: string,
  data: Partial<T>
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, data as DocumentData);
    return true;
  } catch (error) {
    console.error(`Error updating document ${collectionName}/${documentId}:`, error);
    return false;
  }
}

// Delete document
export async function deleteDocument(
  collectionName: string,
  documentId: string
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting document ${collectionName}/${documentId}:`, error);
    return false;
  }
}

// ============ Batch Operations ============

// Create a write batch
export function createBatch() {
  return writeBatch(db);
}

// Commit a batch
export async function commitBatch(batch: ReturnType<typeof writeBatch>): Promise<boolean> {
  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error committing batch:', error);
    return false;
  }
}

// ============ Array Operations ============

// Add to array field
export async function addToArray(
  collectionName: string,
  documentId: string,
  fieldName: string,
  value: unknown
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      [fieldName]: arrayUnion(value),
    });
    return true;
  } catch (error) {
    console.error(`Error adding to array ${collectionName}/${documentId}:`, error);
    return false;
  }
}

// Remove from array field
export async function removeFromArray(
  collectionName: string,
  documentId: string,
  fieldName: string,
  value: unknown
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      [fieldName]: arrayRemove(value),
    });
    return true;
  } catch (error) {
    console.error(`Error removing from array ${collectionName}/${documentId}:`, error);
    return false;
  }
}

// ============ Increment/Decrement ============

// Increment a numeric field
export async function incrementField(
  collectionName: string,
  documentId: string,
  fieldName: string,
  amount: number = 1
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      [fieldName]: increment(amount),
    });
    return true;
  } catch (error) {
    console.error(`Error incrementing field ${collectionName}/${documentId}:`, error);
    return false;
  }
}

// ============ Helper Functions ============

// Convert Date to Firestore Timestamp
export function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

// Get current server timestamp
export function getServerTimestamp() {
  return serverTimestamp();
}

// Create a reference to a document
export function getDocumentRef(collectionName: string, documentId: string): DocumentReference {
  return doc(db, collectionName, documentId);
}

// Create a reference to a subcollection
export function getSubcollectionRef(parentPath: string, subcollectionName: string) {
  return collection(db, `${parentPath}/${subcollectionName}`);
}