// src/server/services/auth/cognitoService.ts
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  GetUserCommand,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  GlobalSignOutCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { type User } from '@prisma/client';
import * as crypto from 'crypto';

interface RegisterUserParams {
email: string;
password: string;
name: string;
}

// Interfaces
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
user: Omit<User, 'password'>;
accessToken: string;
refreshToken: string;
idToken: string;
expiresIn: number;
}

export class CognitoAuthService {
private client: CognitoIdentityProviderClient;
private userPoolId: string;
private clientId: string;
private clientSecret: string;

constructor() {
  this.client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION as string
  });
  
  this.userPoolId = process.env.COGNITO_USER_POOL_ID as string;
  this.clientId = process.env.COGNITO_CLIENT_ID as string;
  this.clientSecret = process.env.COGNITO_CLIENT_SECRET as string;
}

// Método para calcular el SECRET_HASH
// En cognitoService.ts
private calculateSecretHash(username: string): string {
  if (!this.clientSecret) {
    console.error('Cliente secret no está configurado');
    throw new Error('Client secret is not configured');
  }
  
  // El formato correcto es USERNAME + CLIENT_ID
  const message = username + this.clientId;
  const hmac = crypto.createHmac('sha256', this.clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

// Registrar un nuevo usuario
async registerUser(params: RegisterUserParams): Promise<{ success: boolean; userId?: string; message?: string }> {
  try {
    const { email, password, name } = params;
    
    // Crear el usuario en Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      SecretHash: this.calculateSecretHash(email), // Añadir SECRET_HASH
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'name',
          Value: name
        }
      ]
    });
    
    const response = await this.client.send(signUpCommand);
    
    return {
      success: true,
      userId: response.UserSub,
      message: 'Usuario registrado correctamente. Por favor, verifique su correo electrónico para completar el registro.'
    };
  } catch (error: any) {
    console.error('Error al registrar usuario:', error);
    
    // Manejar errores específicos
    if (error.name === 'UsernameExistsException') {
      return {
        success: false,
        message: 'El correo electrónico ya está registrado.'
      };
    }
    
    if (error.name === 'InvalidPasswordException') {
      return {
        success: false,
        message: 'La contraseña no cumple con los requisitos de seguridad.'
      };
    }
    
    throw error;
  }
}

// Confirmar el registro con el código de verificación
async confirmRegistration(email: string, confirmationCode: string): Promise<{ success: boolean; message: string }> {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
      SecretHash: this.calculateSecretHash(email) // Añadir SECRET_HASH
    });
    
    await this.client.send(command);
    
    return {
      success: true,
      message: 'Registro confirmado correctamente.'
    };
  } catch (error: any) {
    console.error('Error al confirmar registro:', error);
    
    if (error.name === 'CodeMismatchException') {
      return {
        success: false,
        message: 'El código de verificación es incorrecto.'
      };
    }
    
    if (error.name === 'ExpiredCodeException') {
      return {
        success: false,
        message: 'El código de verificación ha expirado.'
      };
    }
    
    return {
      success: false,
      message: 'Error al confirmar el registro. Por favor, intente nuevamente.'
    };
  }
}

// Reenviar código de confirmación
async resendConfirmationCode(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: this.clientId,
      Username: email,
      SecretHash: this.calculateSecretHash(email) // Añadir SECRET_HASH
    });
    
    await this.client.send(command);
    
    return {
      success: true,
      message: 'Se ha enviado un nuevo código de verificación a su correo electrónico.'
    };
  } catch (error) {
    console.error('Error al reenviar código:', error);
    
    return {
      success: false,
      message: 'Error al reenviar el código de verificación. Por favor, intente nuevamente.'
    };
  }
}

// Login con Cognito
// En login de cognitoService.ts
async login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { email, password } = credentials;
    console.log("1. Iniciando login con Cognito para:", email);
    
    // Verificar que tenemos los valores de configuración
    console.log("2. Verificando configuración:", {
      region: process.env.AWS_REGION,
      userPoolId: this.userPoolId?.substring(0, 5) + '...',
      clientId: this.clientId?.substring(0, 5) + '...',
      hasSecret: !!this.clientSecret
    });
    
    // Si usamos secreto, calcular SECRET_HASH
    let secretHash;
    if (this.clientSecret) {
      try {
        secretHash = this.calculateSecretHash(email);
        console.log("3. SECRET_HASH calculado correctamente");
      } catch (error) {
        console.error("Error al calcular SECRET_HASH:", error);
        throw error;
      }
    }
    
    // Crear parámetros de autenticación
    const authParams: Record<string, string> = {
      USERNAME: email,
      PASSWORD: password
    };
    
    // Añadir SECRET_HASH si existe
    if (secretHash) {
      authParams.SECRET_HASH = secretHash;
    }
    
    console.log("4. Parámetros de autenticación preparados");
    
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: this.clientId,
      AuthParameters: authParams
    });
    
    console.log("5. Enviando solicitud a Cognito...");
    const response = await this.client.send(command);
    console.log("6. Respuesta recibida de Cognito:", 
      response?.AuthenticationResult ? "Con tokens" : "Sin tokens",
      response?.ChallengeName ? `Desafío: ${response.ChallengeName}` : "Sin desafío"
    );
    
    if (!response.AuthenticationResult) {
      if (response.ChallengeName) {
        throw new Error(`Se requiere completar desafío: ${response.ChallengeName}`);
      }
      throw new Error('Error de autenticación: No se recibieron tokens de autenticación');
    }
    
    // Obtener información del usuario autenticado
    console.log("7. Obteniendo información del usuario...");
    const userInfo = await this.getUserInfo(response.AuthenticationResult.AccessToken as string);
    console.log("8. Información de usuario obtenida:", userInfo.email);
    
    return {
      user: userInfo,
      accessToken: response.AuthenticationResult.AccessToken as string,
      refreshToken: response.AuthenticationResult.RefreshToken as string,
      idToken: response.AuthenticationResult.IdToken as string,
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600
    };
  } catch (error: any) {
    console.error('Error detallado en login Cognito:', error);
    if (error.$metadata) {
      console.error('Metadatos del error:', error.$metadata);
    }
    if (error.__type) {
      console.error('Tipo de error AWS:', error.__type);
    }
    if (error.message) {
      console.error('Mensaje de error:', error.message);
    }
    throw error;
  }
}

// Obtener información del usuario desde Cognito
private async getUserInfo(accessToken: string): Promise<Omit<User, 'password'>> {
  try {
    const command = new GetUserCommand({
      AccessToken: accessToken
    });
    
    const response = await this.client.send(command);
    
    // Mapear atributos de Cognito a nuestro modelo de usuario
    const attributes = response.UserAttributes || [];
    const email = attributes.find(attr => attr.Name === 'email')?.Value || '';
    const name = attributes.find(attr => attr.Name === 'name')?.Value || '';
    const sub = attributes.find(attr => attr.Name === 'sub')?.Value || '';
    
    // Aquí deberíamos obtener el usuario de nuestra base de datos
    // usando el sub como identificador externo
    // Por ahora, devolvemos un usuario básico
    
    return {
      id: sub,
      email,
      name,
      roleId: 'user', // Por defecto, luego actualizamos con info de BD
      createdAt: new Date(),
      updatedAt: new Date(),
      sucursalId: null
    };
  } catch (error) {
    console.error('Error al obtener info de usuario:', error);
    throw error;
  }
}

// Cerrar sesión
async logout(accessToken: string): Promise<void> {
  try {
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken
    });
    
    await this.client.send(command);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
}

// Refrescar token
async refreshToken(refreshToken: string): Promise<Omit<AuthResult, 'user'>> {
  try {
    // Para refresh token no se necesita username, así que no podemos calcular el SECRET_HASH
    const command = new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: this.clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
        // SECRET_HASH no se usa en este flujo
      }
    });
    
    const response = await this.client.send(command);
    
    if (!response.AuthenticationResult) {
      throw new Error('Error al refrescar token');
    }
    
    return {
      accessToken: response.AuthenticationResult.AccessToken as string,
      idToken: response.AuthenticationResult.IdToken as string,
      refreshToken: refreshToken, // Mantener el mismo refresh token
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600
    };
  } catch (error) {
    console.error('Error al refrescar token:', error);
    throw error;
  }
}

// Crear usuario (solo admin)
async createUser(user: {
  email: string;
  name: string;
  password: string;
  roleId: string;
}): Promise<void> {
  try {
    const command = new AdminCreateUserCommand({
      UserPoolId: this.userPoolId,
      Username: user.email,
      TemporaryPassword: user.password,
      UserAttributes: [
        {
          Name: 'email',
          Value: user.email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        },
        {
          Name: 'name',
          Value: user.name
        },
        {
          Name: 'custom:role',
          Value: user.roleId
        }
      ]
    });
    
    await this.client.send(command);
    
    // Aquí deberíamos crear también el usuario en nuestra BD
    // y vincular el id de Cognito
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
}
}

// Singleton para uso en la aplicación
export const cognitoService = new CognitoAuthService();