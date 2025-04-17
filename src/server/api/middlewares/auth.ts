// src/server/api/middlewares/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';

export async function authMiddleware(req: NextRequest) {
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
    // Verificar token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    
    // Obtener usuario de nuestra BD
    const user = await authService.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 401 }
      );
    }
    
    // Adjuntar usuario a la request para uso posterior
    (req as any).user = user;
    
    // No usamos NextResponse.next(), solo retornamos null para indicar que no hay error
    return null;
  } catch (error) {
    console.error('Error al verificar token:', error);
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    );
  }
}