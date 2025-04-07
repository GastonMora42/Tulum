// src/server/services/auth/authService.ts
import { User } from '@prisma/client';
import prisma from '@/server/db/client';
import { cognitoService, LoginCredentials, AuthResult } from './cognitoService';

// Servicio de autenticación que actúa como fachada para Cognito
export class AuthService {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResult | null> {
    try {
      // Autenticar con Cognito
      const cognitoResult = await cognitoService.login(credentials);
      
      // Buscar o crear usuario en nuestra BD
      let user = await prisma.user.findFirst({
        where: { 
          email: credentials.email 
        },
        include: { 
          role: true 
        }
      });
      
      // Si no existe el usuario, lo creamos
      if (!user) {
        // En un sistema real, deberíamos tener un proceso de registro
        // Aquí simplemente creamos el usuario con rol básico
        user = await prisma.user.create({
          data: {
            id: cognitoResult.user.id, // Usar el sub de Cognito como ID
            email: credentials.email,
            name: cognitoResult.user.name || credentials.email.split('@')[0],
            roleId: 'user', // Rol por defecto
          },
          include: { 
            role: true 
          }
        });
      }
      
      // Devolvemos el resultado combinado
      return {
        ...cognitoResult,
        user: {
          ...user,
          // Asegurarse de que usamos los datos de nuestra BD
          id: user.id,
          roleId: user.roleId
        }
      };
    } catch (error) {
      console.error('Error en login:', error);
      return null;
    }
  }
  
  // Cerrar sesión
  async logout(accessToken: string): Promise<boolean> {
    try {
      await cognitoService.logout(accessToken);
      return true;
    } catch (error) {
      console.error('Error en logout:', error);
      return false;
    }
  }
  
  // Refrescar token
  async refreshUserToken(refreshToken: string): Promise<Omit<AuthResult, 'user'> | null> {
    try {
      return await cognitoService.refreshToken(refreshToken);
    } catch (error) {
      console.error('Error al refrescar token:', error);
      return null;
    }
  }
  
  // Obtener usuario por ID
  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
      });
      
      if (!user) return null;
      
      return user;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  }
  
  // Crear usuario (admin)
  async createUser(userData: {
    email: string;
    name: string;
    password: string;
    roleId: string;
    sucursalId?: string;
  }): Promise<User | null> {
    try {
      // Crear usuario en Cognito
      await cognitoService.createUser({
        email: userData.email,
        name: userData.name,
        password: userData.password,
        roleId: userData.roleId
      });
      
      // Crear usuario en nuestra BD
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          roleId: userData.roleId,
          sucursalId: userData.sucursalId || null
        }
      });
      
      return user;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return null;
    }
  }
}

// Singleton para uso en la aplicación
export const authService = new AuthService();

// Función para el cliente (frontend)
export async function refreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    
    // Actualizar tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('idToken', data.idToken);
    
    return true;
  } catch (error) {
    console.error('Error al refrescar token:', error);
    return false;
  }
}