// src/server/api/middlewares/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';

export async function authMiddleware(req: NextRequest) {
  // Excluir rutas públicas
  if (req.nextUrl.pathname.startsWith('/api/auth/login') || 
      req.nextUrl.pathname.startsWith('/api/auth/refresh')) {
    return;
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
    // Verificar token con servicio de Cognito
    // En una implementación real, deberíamos verificar el JWT
    // con la clave pública del grupo de usuarios de Cognito
    
    // Por ahora, simplemente obtenemos el payload del token
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
    
    // Añadir usuario al request para uso posterior
    const requestWithUser = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    (requestWithUser as any).user = user;
    
    return NextResponse.next({
      request: requestWithUser,
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    );
  }
}