import { BUCKETS, supabase } from './config';

// ─── helpers ────────────────────────────────────────────────────────────────

async function uriToUint8Array(uri: string): Promise<Uint8Array> {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

async function upload(
    bucket: string,
    path: string,
    uri: string,
    contentType = 'image/jpeg'
): Promise<string | null> {
    try {
        const data = await uriToUint8Array(uri);

        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, data, { contentType, upsert: true });

        if (error) {
            console.error(`Supabase upload error [${bucket}/${path}]:`, error.message);
            return null;
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        return urlData.publicUrl;
    } catch (err) {
        console.error(`Supabase upload failed [${bucket}/${path}]:`, err);
        return null;
    }
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Upload a user's profile photo.
 * Path: avatars/{userId}/profile.jpg
 * Returns the public URL or null on failure.
 */
export async function uploadUserAvatar(
    userId: string,
    uri: string
): Promise<string | null> {
    return upload(BUCKETS.avatars, `${userId}/profile.jpg`, uri);
}

/**
 * Upload a group cover photo.
 * Path: group-photos/{groupId}/cover.jpg
 * Returns the public URL or null on failure.
 */
export async function uploadGroupPhoto(
    groupId: string,
    uri: string
): Promise<string | null> {
    return upload(BUCKETS.groupPhotos, `${groupId}/cover.jpg`, uri);
}

/**
 * Upload an expense receipt image.
 * Path: receipts/{groupId}/{expenseId}/{timestamp}.jpg
 * Returns the public URL or null on failure.
 */
export async function uploadReceiptImage(
    groupId: string,
    expenseId: string,
    uri: string
): Promise<string | null> {
    const path = `${groupId}/${expenseId}/${Date.now()}.jpg`;
    return upload(BUCKETS.receipts, path, uri);
}

/**
 * Delete a file by its bucket + path.
 * Returns true on success or if file didn't exist.
 */
export async function deleteFile(
    bucket: string,
    path: string
): Promise<boolean> {
    try {
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) {
            console.error(`Supabase delete error [${bucket}/${path}]:`, error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error(`Supabase delete failed [${bucket}/${path}]:`, err);
        return false;
    }
}

/**
 * Delete a user's avatar — convenience wrapper.
 */
export async function deleteUserAvatar(userId: string): Promise<boolean> {
    return deleteFile(BUCKETS.avatars, `${userId}/profile.jpg`);
}

/**
 * Delete a group's cover photo — convenience wrapper.
 */
export async function deleteGroupPhoto(groupId: string): Promise<boolean> {
    return deleteFile(BUCKETS.groupPhotos, `${groupId}/cover.jpg`);
}

/**
 * Get the public URL for any stored file without re-uploading.
 */
export function getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}
