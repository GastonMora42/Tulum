// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token no proporcionado' },
        { status: 400 }
      );
    }
    
    // Refrescar token
    const result = await authService.refreshUserToken(refreshToken);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Refresh token inválido o expirado' },
        { status: 401 }
      );
    }
    
    // Retornar nuevos tokens
    return NextResponse.json({
      accessToken: result.accessToken,
      idToken: result.idToken
    });
  } catch (error: any) {
    console.error('Error en refresh API:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}