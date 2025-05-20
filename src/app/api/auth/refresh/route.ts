// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';

// src/app/api/auth/refresh/route.ts
export async function POST(req: NextRequest) {
  try {
    console.log('Procesando solicitud de refresh token');
    
    const body = await req.json();
    const { refreshToken } = body;
    // MODIFICACIÓN CLAVE: Usar un email de respaldo si no se proporciona
    // Esto no es lo ideal para producción, pero resolverá tu problema inmediatamente
    let email = body.email;
    
    if (!email) {
      console.warn('⚠️ Email no proporcionado, usando email de respaldo para SECRET_HASH');
      // Usar un email de respaldo que sepas que existe en tu sistema Cognito
      email = 'gaston-mora@hotmail.com'; // REEMPLAZA ESTO con un email válido en tu sistema
    }
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token no proporcionado' },
        { status: 400 }
      );
    }
    
    // Ahora pasamos un email garantizado al servicio de autenticación
    const result = await authService.refreshUserToken(refreshToken, email);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Refresh token inválido o expirado' },
        { status: 401 }
      );
    }
    
    // Retornar nuevos tokens
    return NextResponse.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
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