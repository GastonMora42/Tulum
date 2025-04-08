import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@prisma/client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  user: User;
}

interface RefreshResponse {
  accessToken: string;
  idToken: string;
}

interface UseAuthReturn {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    user, 
    setUser, 
    setTokens, 
    clearAuth, 
    accessToken,
    isAuthenticated
  } = useAuthStore();
  
  // Login simplificado
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Guardar email para refresh token
      localStorage.setItem('userEmail', credentials.email);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }
      
      // Guardar tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('idToken', data.idToken);
      
      // Actualizar store
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        idToken: data.idToken
      });
      
      setUser(data.user);
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      console.error('Error de login:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout simplificado
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Limpiar localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('userEmail');
      
      // Limpiar store
      clearAuth();
      
      // Redireccionar a login
      router.push('/login');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }, [clearAuth, router]);
  
  return {
    login,
    logout,
    isLoading,
    error,
    user,
    isAuthenticated
  };
}