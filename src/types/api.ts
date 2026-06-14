// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;                    // For Firestore pagination
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  lastCursor?: string;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface AsyncState<T> extends LoadingState {
  data: T | null;
}