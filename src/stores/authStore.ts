import { User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  refreshUserData: (userId: string) => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: true, // Start as true to prevent premature navigation
      error: null,
      isAuthenticated: false,

      // Actions
      setUser: (user) => {
        console.log('🔐 AuthStore: setUser called', user?.id || 'null');
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
        });
      },
      
      setLoading: (isLoading) => {
        console.log('🔐 AuthStore: setLoading', isLoading);
        set({ isLoading });
      },
      
      setError: (error) => set({ error }),
      
      logout: async () => {
        console.log('🔐 AuthStore: logout called');
        set({ isLoading: true });
        try {
          const { logoutUser } = await import('@/services/firebase/auth');
          await logoutUser();
          set({ user: null, isAuthenticated: false, error: null, isLoading: false });
        } catch (error: any) {
          console.error('Logout error:', error);
          set({ error: error.message, isLoading: false });
        }
      },
      
      refreshUserData: async (userId: string) => {
        console.log('🔐 AuthStore: refreshUserData called for', userId);
        set({ isLoading: true });
        try {
          const { getCurrentUserData } = await import('@/services/firebase/auth');
          const userData = await getCurrentUserData(userId);
          if (userData) {
            set({ user: userData, isAuthenticated: true });
          }
        } catch (error: any) {
          console.error('Refresh user data error:', error);
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      clearAuth: () => {
        console.log('🔐 AuthStore: clearAuth called');
        set({ user: null, isAuthenticated: false, error: null, isLoading: false });
      },
    }),
    {
      name: 'splitify-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);