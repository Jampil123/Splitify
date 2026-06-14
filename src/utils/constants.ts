// ============ App Constants ============

export const APP_NAME = 'Splitify';
export const APP_VERSION = '1.0.0';

// ============ Error Messages ============

export const ERROR_MESSAGES = {
  // Auth errors
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Group errors
  GROUP_NOT_FOUND: 'Group not found.',
  GROUP_CREATE_FAILED: 'Failed to create group. Please try again.',
  GROUP_UPDATE_FAILED: 'Failed to update group.',
  GROUP_DELETE_FAILED: 'Failed to delete group.',
  
  // Expense errors
  EXPENSE_NOT_FOUND: 'Expense not found.',
  EXPENSE_CREATE_FAILED: 'Failed to add expense.',
  EXPENSE_UPDATE_FAILED: 'Failed to update expense.',
  EXPENSE_DELETE_FAILED: 'Failed to delete expense.',
  
  // Member errors
  MEMBER_ADD_FAILED: 'Failed to add member.',
  MEMBER_REMOVE_FAILED: 'Failed to remove member.',
  MIN_MEMBERS_REQUIRED: 'Group must have at least 2 members.',
  
  // Settlement errors
  SETTLEMENT_NOT_FOUND: 'Settlement not found.',
  SETTLEMENT_MARK_FAILED: 'Failed to mark payment as settled.',
  
  // Friend errors
  FRIEND_REQUEST_FAILED: 'Failed to send friend request.',
  FRIEND_ALREADY_EXISTS: 'User is already your friend.',
  PENDING_REQUEST_EXISTS: 'Friend request already pending.',
};

// ============ Success Messages ============

export const SUCCESS_MESSAGES = {
  GROUP_CREATED: 'Group created successfully!',
  GROUP_UPDATED: 'Group updated successfully!',
  GROUP_DELETED: 'Group deleted successfully!',
  
  EXPENSE_ADDED: 'Expense added successfully!',
  EXPENSE_UPDATED: 'Expense updated successfully!',
  EXPENSE_DELETED: 'Expense deleted successfully!',
  
  MEMBER_ADDED: 'Member added successfully!',
  MEMBER_REMOVED: 'Member removed successfully!',
  
  SETTLEMENT_MARKED: 'Payment marked as settled!',
  
  FRIEND_REQUEST_SENT: 'Friend request sent!',
  FRIEND_REQUEST_ACCEPTED: 'Friend request accepted!',
  FRIEND_REMOVED: 'Friend removed successfully!',
  
  PROFILE_UPDATED: 'Profile updated successfully!',
};

// ============ Category Options ============

export const EXPENSE_CATEGORIES = [
  { label: 'Travel', value: 'travel', icon: '✈️', color: '#3B82F6' },
  { label: 'Food', value: 'food', icon: '🍔', color: '#F59E0B' },
  { label: 'Accommodation', value: 'accommodation', icon: '🏨', color: '#8B5CF6' },
  { label: 'Utilities', value: 'utilities', icon: '💡', color: '#10B981' },
  { label: 'Shopping', value: 'shopping', icon: '🛍️', color: '#EC4899' },
  { label: 'Other', value: 'other', icon: '📝', color: '#6B7280' },
] as const;

// ============ Payment Methods ============

export const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash', icon: '💵' },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: '🏦' },
  { label: 'GCash', value: 'gcash', icon: '📱' },
  { label: 'Maya', value: 'maya', icon: '📱' },
  { label: 'Other', value: 'other', icon: '📝' },
] as const;

// ============ Split Types ============

export const SPLIT_TYPES = {
  EQUAL: 'equal',
  CUSTOM: 'custom',
} as const;

export const SPLIT_TYPE_OPTIONS = [
  { label: 'Equal Split', value: 'equal', description: 'Split equally among all members' },
  { label: 'Custom Split', value: 'custom', description: 'Specify different amounts per person' },
] as const;

// ============ Notification Types ============

export const NOTIFICATION_TYPES = {
  EXPENSE_ADDED: 'expense_added',
  EXPENSE_UPDATED: 'expense_updated',
  EXPENSE_DELETED: 'expense_deleted',
  SETTLEMENT_REMINDER: 'settlement_reminder',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  GROUP_INVITE: 'group_invite',
  PAYMENT_REQUEST: 'payment_request',
} as const;

// ============ Storage Keys ============

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@splitify_auth_token',
  USER_DATA: '@splitify_user_data',
  NOTIFICATIONS_ENABLED: '@splitify_notifications_enabled',
  ONBOARDING_COMPLETED: '@splitify_onboarding_completed',
} as const;