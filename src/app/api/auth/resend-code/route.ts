// src/app/api/auth/resend-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';
import { z } from 'zod';

// Esquema de validación
const resendSchema = z.object({
  email: z.string().email({ message: 'Email inválido' })
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar datos
    const validation = resendSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Reenviar código
    const result = await authService.resendConfirmationCode(validation.data.email);
    
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
    console.error('Error al reenviar código:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}