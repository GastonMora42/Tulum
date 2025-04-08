// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';
import { z } from 'zod';

// Esquema de validación
const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Contraseña debe tener al menos 6 caracteres' })
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Intento de login para:", body.email);
    
    // Validar datos de entrada
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      console.log("Error de validación:", validation.error.errors);
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Intentar login
    try {
      const result = await authService.login({
        email: body.email,
        password: body.password
      });
      
      console.log("Login exitoso para:", body.email);
      
      // Retornar resultado exitoso
      if (!result) {
        return NextResponse.json(
          { error: 'Error en la autenticación' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        idToken: result.idToken
      });
    } catch (loginError: any) {
      console.error("Error específico de login:", loginError);
      
      // Manejar diferentes tipos de errores
      if (loginError.message?.includes('NotAuthorizedException') || 
          loginError.message?.includes('Incorrect username or password')) {
        return NextResponse.json(
          { error: 'Credenciales incorrectas' },
          { status: 401 }
        );
      }
      
      if (loginError.message?.includes('UserNotConfirmedException')) {
        return NextResponse.json(
          { error: 'Usuario no confirmado. Por favor verifica tu correo electrónico.' },
          { status: 403 }
        );
      }
      
      throw loginError; // Re-lanzar para el manejador global
    }
  } catch (error: any) {
    console.error('Error general en login API:', error);
    
    // Crear un mensaje de error más amigable
    let errorMessage = 'Error en el servidor';
    
    if (error.message) {
      // Sanitizar el mensaje de error para no exponer detalles técnicos
      errorMessage = error.message.includes('AWS') || error.message.includes('Cognito') 
        ? 'Error en el servicio de autenticación' 
        : error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}