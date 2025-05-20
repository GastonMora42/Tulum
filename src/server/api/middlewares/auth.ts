// src/server/api/middlewares/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';
import prisma, { reconnectPrisma } from '@/server/db/client';

// src/server/api/middlewares/auth.ts
export async function authMiddleware(req: NextRequest) {
  try {
    // Excluir rutas públicas
    if (req.nextUrl.pathname.startsWith('/api/auth/login') || 
        req.nextUrl.pathname.startsWith('/api/auth/refresh')) {
      return null; // Sin error, continuar
    }
    
    // Obtener token de la cabecera
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar token con manejo de errores mejorado
      let payload;
      try {
        // Agregar validación para el formato del token
        if (!token || token.split('.').length !== 3) {
          throw new Error('Formato de token inválido');
        }
        payload = JSON.parse(atob(token.split('.')[1]));
      } catch (tokenError) {
        console.error('Error al decodificar token:', tokenError);
        return NextResponse.json(
          { error: 'Token inválido o mal formado' },
          { status: 401 }
        );
      }
      
      const userId = payload.sub;
      let user;
      try {
        // Obtener usuario de nuestra BD
        user = await authService.getUserById(userId);
      } catch (dbError) {
        console.error('Error en base de datos:', dbError);
        
        // Intentar reconectar y volver a intentar una vez
        if (await reconnectPrisma()) {
          // Reintentar obtener el usuario
          user = await authService.getUserById(userId);
        } else {
          throw new Error('Error de conexión a base de datos persistente');
        }
      }
      
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 401 }
        );
      }
      
      // Adjuntar usuario a la request para uso posterior
      (req as any).user = user;
      
      return null;
    } catch (error) {
      console.error('Error al verificar token:', error);
      return NextResponse.json(
        { error: 'Token inválido o error en base de datos' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error general en middleware de autenticación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}