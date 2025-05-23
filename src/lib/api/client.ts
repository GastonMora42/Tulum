// src/lib/api/client.ts
import { refreshToken } from '@/server/services/auth/authService';

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;
  
  constructor() {
    // Usar la URL base absoluta o relativa dependiendo del entorno
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }
  
  // Método para añadir token de autenticación
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Obtener token del almacenamiento
    const token = localStorage.getItem('authToken');
    if (!token) return this.defaultHeaders;
    
    return {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${token}`
    };
  }
  
  // Método para manejar respuestas y errores
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      // Si es error 401, intentar refresh token
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Reintentamos la petición original
          return this.retry(response.url, response.url, response.body);
        }
      }
      
      // Otros errores
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Error en la petición');
    }
    
    // Si es respuesta exitosa
    return response.json();
  }
  
  // Método para reintentar una petición
  private async retry(url: string, method: string, body: any) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    });
    
    return this.handleResponse(response);
  }
  
  // Métodos HTTP
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      // Asegurarse de que el endpoint comienza con una barra si es una ruta relativa
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = new URL(`${this.baseUrl}${normalizedEndpoint}`);
      
      // Añadir parámetros de consulta
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(url.toString(), { headers });
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error en petición GET:', error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers
    });
    
    return this.handleResponse(response);
  }
}

const apiClient = new ApiClient();
export default apiClient;