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
  
  // Logout (definido primero para evitar el error de referencia)
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (accessToken) {
        try {
          await apiClient.post('/api/auth/logout', { token: accessToken });
        } catch (logoutError) {
          // Continuar con el proceso de logout incluso si la API falla
          console.error('Error en API de logout:', logoutError);
        }
      }
      
      // Limpiar localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      
      // Limpiar store
      clearAuth();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setIsLoading(false);
      
      // Redireccionar a login
      router.push('/login');
    }
  }, [accessToken, clearAuth, router]);
  
  // Función para refrescar el token
  const refreshUserToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) return false;
      
      const response = await apiClient.post<RefreshResponse>('/api/auth/refresh', {
        refreshToken: storedRefreshToken
      });
      
      if (!response || !response.accessToken) return false;
      
      // Actualizar tokens en el store
      setTokens({
        accessToken: response.accessToken,
        refreshToken: storedRefreshToken, // Mantener el mismo refresh token
        idToken: response.idToken
      });
      
      return true;
    } catch (error) {
      console.error('Error al refrescar token:', error);
      return false;
    }
  }, [setTokens]);
  
  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken) return;
      
      try {
        setIsLoading(true);
        
        // Intentar obtener datos del usuario
        const response = await apiClient.get<{ user: User }>('/api/auth/me');
        
        if (response && response.user) {
          setUser(response.user);
        }
      } catch (err) {
        console.error('Error al verificar autenticación:', err);
        
        // Intentar refresh token
        const refreshed = await refreshUserToken();
        
        if (!refreshed) {
          // Si el refresh falla, hacer logout
          await logout();
        } else {
          // Si el refresh tuvo éxito, intentar obtener datos de usuario nuevamente
          try {
            const response = await apiClient.get<{ user: User }>('/api/auth/me');
            if (response && response.user) {
              setUser(response.user);
            }
          } catch (secondErr) {
            console.error('Error después de refrescar token:', secondErr);
            await logout();
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [accessToken, setUser, logout, refreshUserToken]);
  
  // Login
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
      
      if (!response) {
        throw new Error('Respuesta vacía del servidor');
      }
      
      // También guardar en localStorage para persistencia entre recargas
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('idToken', response.idToken);
      
      setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken
      });
      
      setUser(response.user);
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      console.error('Error de login:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    login,
    logout,
    isLoading,
    error,
    user,
    isAuthenticated
  };
}