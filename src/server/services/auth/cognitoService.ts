// src/server/services/auth/cognitoService.ts
import { 
    CognitoIdentityProviderClient, 
    InitiateAuthCommand,
    RespondToAuthChallengeCommand,
    GetUserCommand,
    AdminGetUserCommand,
    AdminCreateUserCommand,
    GlobalSignOutCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { type User } from '@prisma/client';

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
    
    constructor() {
      this.client = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION as string
      });
      
      this.userPoolId = process.env.COGNITO_USER_POOL_ID as string;
      this.clientId = process.env.COGNITO_CLIENT_ID as string;
    }
    
    // Login con Cognito
    async login(credentials: LoginCredentials): Promise<AuthResult> {
      try {
        const { email, password } = credentials;
        
        const command = new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password
          }
        });
        
        const response = await this.client.send(command);
        
        if (!response.AuthenticationResult) {
          throw new Error('Error de autenticación');
        }
        
        // Obtener información del usuario autenticado
        const userInfo = await this.getUserInfo(response.AuthenticationResult.AccessToken as string);
        
        return {
          user: userInfo,
          accessToken: response.AuthenticationResult.AccessToken as string,
          refreshToken: response.AuthenticationResult.RefreshToken as string,
          idToken: response.AuthenticationResult.IdToken as string,
          expiresIn: response.AuthenticationResult.ExpiresIn || 3600
        };
      } catch (error: any) {
        console.error('Error en login Cognito:', error);
        throw new Error(`Error de autenticación: ${error.message}`);
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
        const command = new InitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: this.clientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken
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