// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@prisma/client';

interface LoginCredentials {
  email: string;
  password: string;
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

export const refreshTokenFn = async (): Promise<boolean> => {
  console.log("### INICIANDO REFRESH TOKEN ###");
  
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.error("No hay refresh token disponible");
    return false;
  }
  
  let email = localStorage.getItem('userEmail');
  
  if (!email) {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && accessToken.split('.').length === 3) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        email = String(payload.email || payload.sub || payload.username || '');
        if (email) localStorage.setItem('userEmail', email);
      }
    } catch (e) {
      console.error("Error al extraer email del token:", e);
    }
  }
  
  if (!email) {
    const user = useAuthStore.getState().user;
    if (user && user.email) {
      email = user.email;
      localStorage.setItem('userEmail', email);
    } else {
      console.error("NO SE PUDO RECUPERAR EL EMAIL");
      localStorage.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=missing_email';
      }
      return false;
    }
  }
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, email })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      return false;
    }
    
    const data = await response.json();
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('idToken', data.idToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    
    useAuthStore.getState().setTokens({
      accessToken: data.accessToken,
      idToken: data.idToken,
      refreshToken: data.refreshToken || refreshToken
    });
    
    console.log("Token refrescado exitosamente");
    return true;
  } catch (error) {
    console.error("Error en refresh:", error);
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
  
  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const expirationTime = payload.exp * 1000;
          const currentTime = Date.now();
          
          if (expirationTime - currentTime < 5 * 60 * 1000) {
            console.log('Token próximo a expirar, refrescando...');
            await refreshTokenFn();
          }
        }
      } catch (error) {
        console.error('Error al verificar expiración del token:', error);
      }
    };
    
    checkTokenValidity();
  }, []);
  
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      localStorage.setItem('userEmail', credentials.email);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }

      if (data.user) {
        if (data.user.sucursal) {
          localStorage.setItem('sucursalId', data.user.sucursal.id);
          localStorage.setItem('sucursalNombre', data.user.sucursal.nombre);
        } else if (data.user.sucursalId) {
          localStorage.setItem('sucursalId', data.user.sucursalId);
          try {
            const sucursalResponse = await fetch(`/api/admin/ubicaciones/${data.user.sucursalId}`);
            if (sucursalResponse.ok) {
              const sucursalData = await sucursalResponse.json();
              localStorage.setItem('sucursalNombre', sucursalData.nombre);
            }
          } catch (error) {
            console.warn('No se pudo obtener el nombre de la sucursal', error);
          }
        }
      }
      
      // 🔧 CREAR TOKEN COMPATIBLE AQUÍ
      const compatibleToken = btoa(JSON.stringify({
        sub: data.user.id,
        id: data.user.id,
        email: data.user.email,
        username: data.user.email,
        roleId: data.user.roleId,
        role: data.user.role,
        sucursalId: data.user.sucursalId,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      }));
      
      localStorage.setItem('accessToken', compatibleToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('idToken', data.idToken);
      
      setTokens({
        accessToken: compatibleToken,
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
  
  const refreshToken = useCallback(async (): Promise<boolean> => {
    return refreshTokenFn();
  }, []);
  
  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('accessToken');
      
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
        }
      }
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('userEmail');
      
      clearAuth();
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

// 🔧 AUTHENTICATEDFETCH SIMPLIFICADO
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('accessToken');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  let response = await fetch(url, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    console.log('Token expirado, intentando renovar...');
    const refreshed = await refreshTokenFn();
    
    if (refreshed) {
      const newToken = localStorage.getItem('accessToken');
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...options, headers });
      }
    } else {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }
  
  return response;
};