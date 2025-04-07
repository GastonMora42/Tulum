// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { refreshToken } from '@/server/services/auth/authService';

interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role?: {
    name: string;
    permissions: string[];
  };
  sucursalId?: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        // Obtener usuario actual
        const response = await apiClient.get<{ user: User }>('/api/auth/me');
        setUser(response.user);
      } catch (err) {
        // Intentar refresh token
        const refreshed = await refreshToken();
        if (!refreshed) {
          // Si falla, limpiar datos de sesión
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('idToken');
        } else {
          // Reintentar obtener usuario
          try {
            const response = await apiClient.get<{ user: User }>('/api/auth/me');
            setUser(response.user);
          } catch (error) {
            setError('Error al obtener información de usuario');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post<{
        user: User;
        accessToken: string;
        refreshToken: string;
        idToken: string;
      }>('/api/auth/login', credentials);
      
      // Guardar tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('idToken', response.idToken);
      
      // Establecer usuario
      setUser(response.user);
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout
  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await apiClient.post('/api/auth/logout', { token });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar datos de sesión
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      setUser(null);
      
      // Redireccionar a login
      router.push('/login');
    }
  };
  
  // Verificar permiso específico
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !user.role || !user.role.permissions) return false;
    return user.role.permissions.includes(permission);
  }, [user]);
  
  // Verificar rol
  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    return user.roleId === role;
  }, [user]);
  
  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
    hasRole
  };
}