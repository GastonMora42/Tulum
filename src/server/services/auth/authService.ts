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
      
      // Buscar usuario en nuestra BD
      let user = await prisma.user.findFirst({
        where: { 
          email: credentials.email 
        },
        include: { 
          role: true 
        }
      });
      
          console.log('Usuario encontrado:', user);
    console.log('Rol del usuario:', user?.role);
    
      // Si no existe el usuario, lo creamos
      if (!user) {
        console.log("Usuario no encontrado en BD local, creando...");
        
        // Buscar primero un rol (preferiblemente admin)
        let role = await prisma.role.findFirst({
          where: { name: 'admin' }
        });
        
        // Si no existe ningún rol, necesitamos crear al menos uno
        if (!role) {
          console.log("Creando rol 'admin' porque no existe");
          role = await prisma.role.create({
            data: {
              name: 'admin',
              permissions: ['*'] // Todos los permisos como JSON
            }
          });
        }
        
        // Crear el usuario con el rol encontrado o creado
        user = await prisma.user.create({
          data: {
            id: cognitoResult.user.id, // Usar el sub de Cognito como ID
            email: credentials.email,
            name: cognitoResult.user.name || credentials.email.split('@')[0],
            roleId: role.id,
            // No incluimos sucursalId ya que es opcional en tu esquema
          },
          include: { 
            role: true 
          }
        });
        
        console.log("Usuario creado exitosamente:", user.id);
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
      throw error; // Propagar el error para que el cliente pueda manejarlo
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
      // Verificar que el rol existe
      const roleExists = await prisma.role.findUnique({
        where: { id: userData.roleId }
      });
      
      if (!roleExists) {
        throw new Error(`El rol con ID ${userData.roleId} no existe`);
      }
      
      // Si se proporciona sucursalId, verificar que existe
      if (userData.sucursalId) {
        const sucursalExists = await prisma.ubicacion.findUnique({
          where: { id: userData.sucursalId }
        });
        
        if (!sucursalExists) {
          throw new Error(`La ubicación con ID ${userData.sucursalId} no existe`);
        }
      }
      
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
      throw error;
    }
  }

  // Registrar un nuevo usuario
  async registerUser(userData: {
    email: string;
    name: string;
    password: string;
  }): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      // Registrar en Cognito
      const cognitoResult = await cognitoService.registerUser({
        email: userData.email,
        name: userData.name,
        password: userData.password
      });
      if (!cognitoResult.success) {
        return {
          success: false,
          message: cognitoResult.message || 'Error al registrar usuario en Cognito',
          userId: cognitoResult.userId
        };
      }
      
      return {
        success: true,
        message: cognitoResult.message || 'Usuario registrado exitosamente',
        userId: cognitoResult.userId
      };
    } catch (error) {
      console.error('Error en registro:', error);
      return {
        success: false,
        message: 'Error al registrar usuario'
      };
    }
  }

  // Confirmar registro
  async confirmRegistration(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      return await cognitoService.confirmRegistration(email, code);
    } catch (error) {
      console.error('Error al confirmar registro:', error);
      return {
        success: false,
        message: 'Error al confirmar el registro'
      };
    }
  }

  // Reenviar código de confirmación
  async resendConfirmationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      return await cognitoService.resendConfirmationCode(email);
    } catch (error) {
      console.error('Error al reenviar código:', error);
      return {
        success: false,
        message: 'Error al reenviar el código de verificación'
      };
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