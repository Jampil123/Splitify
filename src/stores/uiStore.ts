import { create } from 'zustand';

interface UIState {
  // State
  isDarkMode: boolean;
  isOnline: boolean;
  showLoadingOverlay: boolean;
  loadingMessage: string | null;
  
  // Actions
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  setOnline: (isOnline: boolean) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  isDarkMode: false,
  isOnline: true,
  showLoadingOverlay: false,
  loadingMessage: null,

  // Actions
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  setDarkMode: (isDark) => set({ isDarkMode: isDark }),
  
  setOnline: (isOnline) => set({ isOnline }),
  
  showLoading: (message) => set({ showLoadingOverlay: true, loadingMessage: message || null }),
  
  hideLoading: () => set({ showLoadingOverlay: false, loadingMessage: null }),
}));