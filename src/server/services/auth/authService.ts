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
  async refreshUserToken(refreshToken: string, emailParam?: string): Promise<Omit<AuthResult, 'user'> | null> {
    try {
      // Usar el email almacenado en localStorage para el SECRET_HASH o el parámetro proporcionado
      let emailToUse = emailParam || '';
      if (typeof localStorage !== 'undefined' && !emailToUse) {
        emailToUse = localStorage.getItem('userEmail') || '';
      }
      
      return await cognitoService.refreshToken(refreshToken, emailToUse);
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

      // Registrar en Cognito
      async registerUser(userData: {
        email: string;
        name: string;
        password: string;
        roleId?: string;
        sucursalId?: string | null;
        isAdminCreation?: boolean;
        skipAutoConfirmation?: boolean; // Nuevo parámetro para controlar si queremos saltar la confirmación automática
      }): Promise<{ success: boolean; message: string; userId?: string }> {
        try {
          // Verificación de rol para creación desde admin (código existente)
          if (userData.isAdminCreation && !userData.roleId) {
            return {
              success: false,
              message: 'Se requiere especificar un rol para la creación de usuarios desde administración'
            };
          }
      
          // Registrar en Cognito
          const cognitoResult = await cognitoService.registerUser({
            email: userData.email,
            name: userData.name,
            password: userData.password,
            roleId: userData.roleId
          });
          
          if (!cognitoResult.success) {
            return {
              success: false,
              message: cognitoResult.message || 'Error al registrar usuario en Cognito',
              userId: cognitoResult.userId
            };
          }
          
          console.log("Usuario registrado en Cognito con éxito, ID:", cognitoResult.userId);
          
          // Si es creación desde admin y queremos confirmación automática (no es nuestro caso ahora)
          if (userData.isAdminCreation && cognitoResult.userId && !userData.skipAutoConfirmation) {
            try {
              console.log("Confirmando usuario automáticamente...");
              await cognitoService.confirmRegistration(userData.email, '', true);
            } catch (confirmError) {
              console.error('Error en confirmación automática:', confirmError);
            }
        
        // Crear usuario en la base de datos local
        try {
          // Asegurarnos de que existe el rol predeterminado si no se especifica uno
          if (!userData.roleId) {
            const defaultRole = await prisma.role.findFirst({
              where: { name: 'vendedor' } // O el rol predeterminado que prefieras
            });
            
            if (!defaultRole) {
              return {
                success: false,
                message: 'No se encontró un rol predeterminado',
                userId: cognitoResult.userId
              };
            }
            
            userData.roleId = defaultRole.id;
          }
          
          // Crear el usuario en la base de datos
          const user = await prisma.user.create({
            data: {
              id: cognitoResult.userId,
              email: userData.email,
              name: userData.name,
              roleId: userData.roleId,
              sucursalId: userData.sucursalId || null
            }
          });
          
          console.log(`Usuario ${user.id} creado en la base de datos local`);
        } catch (dbError) {
          console.error('Error al crear usuario en la base de datos:', dbError);
          return {
            success: false,
            message: 'Error al crear usuario en la base de datos local',
            userId: cognitoResult.userId
          };
        }
      }
      
      return {
        success: true,
        message: userData.isAdminCreation 
          ? 'Usuario creado y confirmado correctamente'
          : 'Usuario registrado correctamente. Por favor, verifique su correo electrónico para completar el registro.',
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

  // En authService.ts - Agregar función para confirmación administrativa

async adminConfirmUser(email: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Confirmando usuario administrativamente:", email);
    
    const result = await cognitoService.confirmRegistration(email, '', true);
    
    if (result.success) {
      console.log("Usuario confirmado con éxito:", email);
      return {
        success: true,
        message: 'Usuario confirmado correctamente'
      };
    } else {
      return {
        success: false,
        message: result.message
      };
    }
  } catch (error) {
    console.error('Error al confirmar usuario administrativamente:', error);
    return {
      success: false,
      message: 'Error al confirmar usuario'
    };
  }
}

// En authService.ts - Implementar método para creación y sincronización de usuarios

async createOrSyncUser(userData: {
  email: string;
  name: string;
  password: string;
  roleId: string;
  sucursalId?: string | null;
}): Promise<{ success: boolean; message: string; user?: User; isNewUser?: boolean }> {
  try {
    // Verificar si el usuario existe en la BD local
    const existingLocalUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });
    
    // Verificar si el usuario existe en Cognito
    let existingCognitoUser = null;
    try {
      existingCognitoUser = await cognitoService.getUserByUsername(userData.email);
    } catch (cognitoError: unknown) {
      // Ignorar error de usuario no encontrado
      if (cognitoError instanceof Error && cognitoError.name !== 'UserNotFoundException') {
        throw cognitoError;
      }
    }
    // Caso 1: Usuario existe en ambos sistemas
    if (existingLocalUser && existingCognitoUser) {
      return {
        success: false,
        message: 'El usuario ya existe en el sistema',
        user: existingLocalUser,
        isNewUser: false
      };
    }
    
    // Caso 2: Usuario existe en Cognito pero no en BD local (desincronización)
    if (!existingLocalUser && existingCognitoUser) {
      console.log(`Usuario ${userData.email} existe en Cognito pero no en BD local. Sincronizando...`);
      
      // Crear usuario en BD local con el ID de Cognito
      const userId = existingCognitoUser.Username || existingCognitoUser.User?.Username;
      
      const syncedUser = await prisma.user.create({
        data: {
          id: userId,
          email: userData.email,
          name: userData.name,
          roleId: userData.roleId,
          sucursalId: userData.sucursalId
        }
      });
      
      return {
        success: true,
        message: 'Usuario sincronizado con el sistema de autenticación',
        user: syncedUser,
        isNewUser: false
      };
    }
    
    // Caso 3: Usuario existe en BD local pero no en Cognito (muy raro, pero posible)
    if (existingLocalUser && !existingCognitoUser) {
      console.log(`Usuario ${userData.email} existe en BD local pero no en Cognito. Creando en Cognito...`);
      
      // Registrar en Cognito
      const cognitoResult = await cognitoService.registerUser({
        email: userData.email,
        name: userData.name,
        password: userData.password,
        roleId: userData.roleId
      });
      
      if (!cognitoResult.success) {
        throw new Error(cognitoResult.message || 'Error al crear usuario en el sistema de autenticación');
      }
      
      return {
        success: true,
        message: 'Usuario sincronizado con el sistema de autenticación',
        user: existingLocalUser,
        isNewUser: false
      };
    }
    
    // Caso 4: Usuario no existe en ningún sistema (caso normal de creación)
    console.log(`Creando nuevo usuario ${userData.email} en ambos sistemas...`);
    
    // Registrar en Cognito
    const cognitoResult = await cognitoService.registerUser({
      email: userData.email,
      name: userData.name,
      password: userData.password,
      roleId: userData.roleId
    });
    
    if (!cognitoResult.success) {
      throw new Error(cognitoResult.message || 'Error al crear usuario en el sistema de autenticación');
    }
    
    // Crear en BD local
    const newUser = await prisma.user.create({
      data: {
        id: cognitoResult.userId,
        email: userData.email,
        name: userData.name,
        roleId: userData.roleId,
        sucursalId: userData.sucursalId
      }
    });
    
    return {
      success: true,
      message: 'Usuario creado correctamente. Por favor, verifique el correo para activar la cuenta.',
      user: newUser,
      isNewUser: true
    };
  } catch (error) {
    console.error('Error en creación/sincronización de usuario:', error);
    throw error;
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