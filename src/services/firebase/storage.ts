import {
    deleteObject,
    getDownloadURL,
    ref,
    storage,
    uploadBytes,
} from './config';

// ============ Storage Operations ============

// Upload receipt image
export async function uploadReceiptImage(
  expenseId: string,
  groupId: string,
  uri: string
): Promise<string | null> {
  try {
    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create reference with path: receipts/{groupId}/{expenseId}/{timestamp}
    const timestamp = Date.now();
    const path = `receipts/${groupId}/${expenseId}/${timestamp}.jpg`;
    const fileRef = ref(storage, path);
    
    // Upload file
    await uploadBytes(fileRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(fileRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading receipt image:', error);
    return null;
  }
}

// Upload group photo
export async function uploadGroupPhoto(
  groupId: string,
  uri: string
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const path = `group-photos/${groupId}/cover.jpg`;
    const fileRef = ref(storage, path);
    
    await uploadBytes(fileRef, blob);
    const downloadURL = await getDownloadURL(fileRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading group photo:', error);
    return null;
  }
}

// Upload user avatar
export async function uploadUserAvatar(
  userId: string,
  uri: string
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const path = `avatars/${userId}/profile.jpg`;
    const fileRef = ref(storage, path);
    
    await uploadBytes(fileRef, blob);
    const downloadURL = await getDownloadURL(fileRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading user avatar:', error);
    return null;
  }
}

// Delete file
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

// Get download URL (for existing references)
export async function getFileDownloadURL(path: string): Promise<string | null> {
  try {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    console.error('Error getting download URL:', error);
    return null;
  }
}