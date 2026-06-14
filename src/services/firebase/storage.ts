import {
  deleteObject,
  getDownloadURL,
  isStorageAvailable, // ✅ This is a boolean now
  ref,
  storage,
  uploadBytes,
} from './config';

// ============ Storage Availability Check ============

export function isStorageConfigured(): boolean {
    return isStorageAvailable;  // ✅ Return the boolean value directly
}

// ============ Storage Operations with Null Safety ============

/**
 * Upload receipt image (returns null if storage not available)
 */
export async function uploadReceiptImage(
    expenseId: string,
    groupId: string,
    uri: string
): Promise<string | null> {
    // Check if storage is available
    if (!isStorageAvailable) {  // ✅ Use boolean directly, not as function
        console.warn('Storage not available - receipt image upload skipped');
        return null;
    }

    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const timestamp = Date.now();
        const path = `receipts/${groupId}/${expenseId}/${timestamp}.jpg`;
        const fileRef = ref(storage!, path);
        
        await uploadBytes(fileRef, blob);
        const downloadURL = await getDownloadURL(fileRef);
        
        return downloadURL;
    } catch (error) {
        console.error('Error uploading receipt image:', error);
        return null;
    }
}

/**
 * Upload group photo (returns null if storage not available)
 */
export async function uploadGroupPhoto(
    groupId: string,
    uri: string
): Promise<string | null> {
    if (!isStorageAvailable) {  // ✅ Use boolean directly
        console.warn('Storage not available - group photo upload skipped');
        return null;
    }

    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const path = `group-photos/${groupId}/cover.jpg`;
        const fileRef = ref(storage!, path);
        
        await uploadBytes(fileRef, blob);
        const downloadURL = await getDownloadURL(fileRef);
        
        return downloadURL;
    } catch (error) {
        console.error('Error uploading group photo:', error);
        return null;
    }
}

/**
 * Upload user avatar (returns null if storage not available)
 */
export async function uploadUserAvatar(
    userId: string,
    uri: string
): Promise<string | null> {
    if (!isStorageAvailable) {  // ✅ Use boolean directly
        console.warn('Storage not available - avatar upload skipped');
        return null;
    }

    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const path = `avatars/${userId}/profile.jpg`;
        const fileRef = ref(storage!, path);
        
        await uploadBytes(fileRef, blob);
        const downloadURL = await getDownloadURL(fileRef);
        
        return downloadURL;
    } catch (error) {
        console.error('Error uploading user avatar:', error);
        return null;
    }
}

/**
 * Delete file (returns true even if storage not available)
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
    if (!isStorageAvailable) {  // ✅ Use boolean directly
        console.warn('Storage not available - delete skipped');
        return true;
    }

    try {
        const fileRef = ref(storage!, fileUrl);
        await deleteObject(fileRef);
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

/**
 * Get download URL (returns null if storage not available)
 */
export async function getFileDownloadURL(path: string): Promise<string | null> {
    if (!isStorageAvailable) {  // ✅ Use boolean directly
        console.warn('Storage not available - cannot get download URL');
        return null;
    }

    try {
        const fileRef = ref(storage!, path);
        const url = await getDownloadURL(fileRef);
        return url;
    } catch (error) {
        console.error('Error getting download URL:', error);
        return null;
    }
}