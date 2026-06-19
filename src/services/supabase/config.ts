import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing — storage will not work');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Bucket names — create these in Supabase dashboard > Storage
export const BUCKETS = {
    avatars: 'avatars',
    groupPhotos: 'group-photos',
    receipts: 'receipts',
} as const;
