// src/app/api/auth/confirm/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;
    
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email y código son requeridos' },
        { status: 400 }
      );
    }
    
    console.log(`Intentando confirmar usuario: ${email} con código: ${code}`);
    
    const result = await authService.confirmRegistration(email, code);
    
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
    console.error('Error al confirmar usuario:', error);
    return NextResponse.json(
      { error: error.message || 'Error al confirmar usuario' },
      { status: 500 }
    );
  }
}