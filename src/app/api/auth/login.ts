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
    
    // Validar datos de entrada
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Intentar login
    const result = await authService.login({
      email: body.email,
      password: body.password
    });
    
    if (!result) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }
    
    // Retornar resultado exitoso
    return NextResponse.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      idToken: result.idToken
    });
  } catch (error: any) {
    console.error('Error en login API:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}