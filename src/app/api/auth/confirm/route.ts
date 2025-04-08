// src/app/api/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';
import { z } from 'zod';

// Esquema de validación
const confirmSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  code: z.string().min(6, { message: 'Código de verificación inválido' }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar datos
    const validation = confirmSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Confirmar registro
    const result = await authService.confirmRegistration(
      validation.data.email,
      validation.data.code
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('Error al confirmar registro:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}