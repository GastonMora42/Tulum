// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  refreshToken?: string;
}

interface UseAuthReturn {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

// Función para refrescar token que se puede usar desde fuera del hook
export const refreshTokenFn = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('refreshToken');
  const email = localStorage.getItem('userEmail');
  
  if (!refreshToken) {
    console.warn('No hay refresh token disponible');
    return false;
  }
  
  try {
    console.log('Intentando refrescar token con email:', email);
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken,
        email // Asegurar que se envía el email
      })
    });
    
    if (!response.ok) {
      console.error('Error al refrescar token:', response.status);
      
      // Si el error es de autenticación, limpiar tokens y redirigir a login
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('idToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      
      return false;
    }
    
    const data: RefreshResponse = await response.json();
    
    // Actualizar tokens en localStorage
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('idToken', data.idToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    
    // Actualizar tokens en el store global
    if (useAuthStore.getState()) {
      useAuthStore.getState().setTokens({
        accessToken: data.accessToken,
        idToken: data.idToken,
        refreshToken: data.refreshToken || refreshToken // Mantener el actual si no viene uno nuevo
      });
    }
    
    console.log('Token refrescado exitosamente');
    return true;
  } catch (error) {
    console.error('Error al refrescar token:', error);
    return false;
  }
};

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
  
  // Verificar token al montar el componente
  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) return;
      
      // Verificar si el token está próximo a expirar
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convertir a milisegundos
        const currentTime = Date.now();
        
        // Si el token expira en menos de 5 minutos, refrescarlo
        if (expirationTime - currentTime < 5 * 60 * 1000) {
          console.log('Token próximo a expirar, refrescando...');
          await refreshTokenFn();
        }
      } catch (error) {
        console.error('Error al verificar expiración del token:', error);
      }
    };
    
    checkTokenValidity();
  }, []);
  
  // Login mejorado
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Guardar email para refresh token
      localStorage.setItem('userEmail', credentials.email);
      
      console.log('Iniciando sesión...');
      
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
      
      console.log('Sesión iniciada correctamente');
      
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
  
  // Método para refrescar token dentro del hook
  const refreshToken = useCallback(async (): Promise<boolean> => {
    return refreshTokenFn();
  }, []);
  
  // Logout mejorado
  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Intentar hacer logout en el servidor si hay token
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (apiError) {
          console.warn('Error al cerrar sesión en el servidor:', apiError);
          // Continuamos con el logout local aunque falle en el servidor
        }
      }
      
      // Limpiar localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('userEmail');
      
      // Limpiar store
      clearAuth();
      
      console.log('Sesión cerrada correctamente');
      
      // Redireccionar a login
      router.push('/login');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }, [clearAuth, router]);
  
  return {
    login,
    logout,
    refreshToken,
    isLoading,
    error,
    user,
    isAuthenticated
  };
}

// En src/hooks/useAuth.ts
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Preparar headers
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('accessToken');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  try {
    // Realizar la petición
    let response = await fetch(url, {
      ...options,
      headers
    });
    
    // Si recibimos un 401, intentar refrescar el token y reintentar
    if (response.status === 401) {
      console.log('Token expirado, intentando refrescar...');
      
      const refreshed = await refreshTokenFn();
      
      if (refreshed) {
        // Obtener el nuevo token
        const newToken = localStorage.getItem('accessToken');
        
        // Actualizar el header de autorización
        headers.set('Authorization', `Bearer ${newToken}`);
        
        // Reintentar la petición original
        console.log('Reintentando petición con nuevo token...');
        response = await fetch(url, {
          ...options,
          headers
        });
      } else {
        // Si no se pudo refrescar, redirigir a login
        console.error('No se pudo refrescar el token, redirigiendo a login...');
        
        // Limpiar tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('idToken');
        
        // Limpiar store
        if (useAuthStore.getState()) {
          useAuthStore.getState().clearAuth();
        }
        
        // Redirigir a login
        if (typeof window !== 'undefined') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error en la solicitud:', error);
    // Crear una respuesta de error controlada
    return new Response(JSON.stringify({ error: 'Error de red' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};