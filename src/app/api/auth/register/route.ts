// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';
import { z } from 'zod';

// Esquema de validación
const registerSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres y contener una mayuscula, una minusculam un caracter especial y un numero' }),
  name: z.string().min(3, { message: 'El nombre debe tener al menos 4 caracteres' })
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar datos
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Registrar usuario
    const result = await authService.registerUser({
      email: validation.data.email,
      password: validation.data.password,
      name: validation.data.name
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
      userId: result.userId
    });
  } catch (error: any) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}