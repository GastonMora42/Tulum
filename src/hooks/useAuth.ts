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

export const refreshTokenFn = async (): Promise<boolean> => {
  console.log("### INICIANDO REFRESH TOKEN ###");
  
  // 1. Obtener refresh token
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.error("No hay refresh token disponible");
    return false;
  }
  
  // 2. SOLUCIÓN CRÍTICA: Obtener email - usar múltiples fuentes
  // Primero intentar obtenerlo directamente de localStorage
  let email = localStorage.getItem('userEmail');
  console.log(`Email encontrado en localStorage: ${email ? 'SÍ' : 'NO'}`);
  
  // Si no está en localStorage, buscarlo en el token JWT
  if (!email) {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && accessToken.split('.').length === 3) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        console.log("Contenido del token JWT:", Object.keys(payload));
        
        // Intentar todas las propiedades posibles donde podría estar el email
        email = String(payload.email || payload.sub || payload.username || '');
        
        if (email) {
          console.log(`Email recuperado del token: ${email}`);
          localStorage.setItem('userEmail', email);
        }
      }
    } catch (e) {
      console.error("Error al extraer email del token:", e);
    }
  }
  
  // 3. MEDIDA EXTREMA: Si aún no tenemos email, usar un valor por defecto temporal
  // Esto es muy importante: si no tenemos email, intentar usar el último usuario conocido
  if (!email) {
    console.warn("### ADVERTENCIA: NO SE PUDO OBTENER EMAIL, USANDO VALOR DE RESPALDO ###");
    
    // Verificar si hay algún usuario en la store
    const user = useAuthStore.getState().user;
    if (user && user.email) {
      email = user.email;
      console.log(`Usando email del store: ${email}`);
      localStorage.setItem('userEmail', email);
    } else {
      // Si todo falla, redireccionar al login
      console.error("NO SE PUDO RECUPERAR EL EMAIL, REDIRIGIENDO A LOGIN");
      localStorage.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?error=missing_email';
      }
      return false;
    }
  }
  
  // 4. Ahora que tenemos email garantizado, hacer la petición
  try {
    console.log(`Enviando refresh con email: ${email}`);
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken,
        email       // Este email ya está garantizado que es string y no null
      })
    });
    
    if (!response.ok) {
      console.error(`Error en refresh: ${response.status}`);
      
      if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      
      return false;
    }
    
    const data = await response.json();
    
    // Guardar tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('idToken', data.idToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    
    // Actualizar store
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
  
  // Verificar token al montar el componente
  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (!token) return;
      
      // Verificar si el token está próximo a expirar
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const expirationTime = payload.exp * 1000; // Convertir a milisegundos
          const currentTime = Date.now();
          
          // Si el token expira en menos de 5 minutos, refrescarlo
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

      if (data.user) {
        // Si tenemos información de sucursal incluida en la respuesta
        if (data.user.sucursal) {
          localStorage.setItem('sucursalId', data.user.sucursal.id);
          localStorage.setItem('sucursalNombre', data.user.sucursal.nombre);
          console.log(`Sucursal guardada: ${data.user.sucursal.nombre} (${data.user.sucursal.id})`);
        } 
        // Si solo tenemos ID de sucursal pero no el objeto completo
        else if (data.user.sucursalId) {
          localStorage.setItem('sucursalId', data.user.sucursalId);
          
          // Obtener nombre de la sucursal mediante una llamada API adicional
          try {
            const sucursalResponse = await fetch(`/api/admin/ubicaciones/${data.user.sucursalId}`);
            if (sucursalResponse.ok) {
              const sucursalData = await sucursalResponse.json();
              localStorage.setItem('sucursalNombre', sucursalData.nombre);
              console.log(`Nombre de sucursal obtenido: ${sucursalData.nombre}`);
            }
          } catch (error) {
            console.warn('No se pudo obtener el nombre de la sucursal', error);
          }
        }
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

// Función para hacer peticiones autenticadas
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
      
      // Verificar que el email existe antes de intentar refrescar
      const email = localStorage.getItem('userEmail');
      if (!email) {
        console.warn("No hay email para refresh, intentando recuperarlo...");
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          try {
            const parts = accessToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.email) {
                localStorage.setItem('userEmail', payload.email);
                console.log('Email recuperado del token para futuros refreshes:', payload.email);
              }
            }
          } catch (error) {
            console.error('Error al extraer email del token:', error);
          }
        }
      }
      
      const refreshed = await refreshTokenFn();
      
      if (refreshed) {
        // Obtener el nuevo token
        const newToken = localStorage.getItem('accessToken');
        
        if (newToken) {
          // Actualizar el header de autorización
          headers.set('Authorization', `Bearer ${newToken}`);
          
          // Reintentar la petición original
          console.log('Reintentando petición con nuevo token...');
          response = await fetch(url, {
            ...options,
            headers
          });
        }
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