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
 * Format time only (e.g., "2:30 PM")
 * @param date - Date object or Firestore Timestamp
 * @returns Formatted time string
 */
export function formatTime(date: Date | Timestamp): string {
  const dateObj = date instanceof Timestamp ? date.toDate() : date;
  return new Intl.DateTimeFormat('fil-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Format date and time together
 * @param date - Date object or Firestore Timestamp
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | Timestamp): string {
  return `${formatDate(date, 'short')} at ${formatTime(date)}`;
}

/**
 * Convert Date to Firestore Timestamp
 * @param date - JavaScript Date
 * @returns Firestore Timestamp
 */
export function toFirestoreTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Get start and end of day for filtering
 * @param date - Date to get range for
 * @returns Object with start and end Timestamps
 */
export function getDateRange(date: Date): { start: Timestamp; end: Timestamp } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | Timestamp): boolean {
  const dateObj = date instanceof Timestamp ? date.toDate() : date;
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear();
}

/**
 * Group expenses by date
 * @param items - Array of objects with date property
 * @returns Object with date keys and arrays of items
 */
export function groupByDate<T extends { date: Date | Timestamp }>(
  items: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  items.forEach(item => {
    const dateKey = formatDate(item.date, 'short');
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(item);
  });
  
  return grouped;
}