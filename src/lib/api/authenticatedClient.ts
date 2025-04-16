// src/lib/api/authenticatedClient.ts
import { refreshToken } from "@/server/services/auth/authService";

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  // Obtener token
  const token = localStorage.getItem('accessToken');
  
  // Configurar headers
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');
  
  // Primera solicitud
  let response = await fetch(url, {
    ...options,
    headers
  });
  
  // Si obtenemos 401, intentar refrescar el token
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Obtener el nuevo token y reintentar
      const newToken = localStorage.getItem('accessToken');
      headers.set('Authorization', `Bearer ${newToken}`);
      
      // Reintentar la solicitud
      response = await fetch(url, {
        ...options,
        headers
      });
    }
  }
  
  return response;
};