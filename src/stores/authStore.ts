import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@prisma/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  
  // Acciones
  setUser: (user: User | null) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string; idToken: string }) => void;
  clearAuth: () => void;
  
  // Helpers
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      isAuthenticated: false,
      
      setUser: (user) => set({ 
        user,
        isAuthenticated: !!user 
      }),
      
      setTokens: (tokens) => set({ 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken
      }),
      
      clearAuth: () => set({ 
        user: null, 
        accessToken: null,
        refreshToken: null,
        idToken: null,
        isAuthenticated: false 
      }),
      
      hasPermission: (permission) => {
        const { user } = get();
        if (!user || !user.roleId) return false;
        // TODO: Implementar lógica de permisos cuando se tenga acceso al rol
        return false;
      },
      
      hasRole: (roleName) => {
        const { user } = get();
        if (!user || !user.roleId) return false;
        // TODO: Implementar lógica de roles cuando se tenga acceso al rol
        return false;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        idToken: state.idToken,
        user: state.user,
      })
    }
  )
);