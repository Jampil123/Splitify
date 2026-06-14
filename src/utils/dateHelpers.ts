import { Timestamp } from 'firebase/firestore';

/**
 * Format date to readable string
 * @param date - Date object or Firestore Timestamp
 * @param format - Format style: 'short', 'long', 'relative'
 * @returns Formatted date string
 */
export function formatDate(
    date: Date | Timestamp,
    format: 'short' | 'long' | 'relative' = 'short'
): string {
    // Convert Firestore Timestamp to Date if needed
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    
    switch (format) {
        case 'short':
            return new Intl.DateTimeFormat('fil-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }).format(dateObj);
        
        case 'long':
            return new Intl.DateTimeFormat('fil-PH', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            }).format(dateObj);
        
        case 'relative':
            return getRelativeTime(dateObj);
        
        default:
            return dateObj.toLocaleDateString();
    }
}

/**
 * Get relative time string (e.g., "2 days ago", "just now")
 * @param date - Date to compare
 * @returns Relative time string
 */
export function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
        return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
        return 'yesterday';
    }
    
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    
    if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(diffInDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

/**
 * Format relative time for notifications (e.g., "2m ago", "1h ago")
 * @param date - Date to format
 * @returns Short relative time string
 */
export function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
        return 'yesterday';
    }
    
    return `${diffInDays}d ago`;
}