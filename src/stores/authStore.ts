// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@prisma/client';
import { UserWithRole } from '@/types/user';

interface AuthState {
  user: User | UserWithRole | null;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  
  // Acciones
  setUser: (user: User | UserWithRole | null) => void;
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
      
      // Implementación correcta de setUser
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
        
        // Si es admin (basado en roleId), tiene todos los permisos
        if (user.roleId === 'role-admin') return true;
        
        // Verificar si tiene objeto role anidado (UserWithRole)
        if ('role' in user && user.role) {
          // Si tiene role con permisos como array
          if ('permissions' in user.role) {
            const permissions = Array.isArray(user.role.permissions) 
              ? user.role.permissions 
              : JSON.parse(String(user.role.permissions));
            
            return permissions.includes('*') || permissions.includes(permission);
          }
        }
        
        // Por defecto, sin permisos
        return false;
      },
      
      hasRole: (roleName) => {
        const { user } = get();
        if (!user || !user.roleId) return false;
        
        // Comprobar por el formato 'role-{roleName}'
        if (user.roleId === `role-${roleName}`) return true;
        
        // Comprobar si tiene el objeto role anidado (UserWithRole)
        if ('role' in user && user.role && 'name' in user.role) {
          return user.role.name === roleName;
        }
        
        // Comprobar si roleId termina con el nombre del rol
        const roleIdParts = user.roleId.split('-');
        if (roleIdParts.length > 1 && roleIdParts[roleIdParts.length - 1] === roleName) {
          return true;
        }
        
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