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
    
    // Enfoque mejorado: usar headers customizados para pasar información del usuario
    const newHeaders = new Headers(req.headers);
    newHeaders.set('x-user-id', user.id);
    newHeaders.set('x-user-role', user.roleId);
    
    // Crear un objeto con los datos del usuario para pasar al contexto
    const userData = JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      // Incluir role si existe y tiene permissions
      role: user.roleId ? {
        id: user.roleId,
        name: user.roleId,
        permissions: [] // Por ahora no incluimos permisos ya que no están disponibles en el tipo de usuario
      } : undefined
    });
    
    newHeaders.set('x-user-data', userData);
    
    // Crear nueva request con los headers modificados
    const newRequest = new Request(req.url, {
      method: req.method,
      headers: newHeaders,
      body: req.body,
    });
    
    // Almacenar usuario directamente en la request para compatibilidad con el código existente
    // Nota: esto puede no funcionar en todos los entornos/middlewares de Next.js
    (newRequest as any).user = user;
    
    // Devolver nueva respuesta con la request modificada
    return NextResponse.next({
      request: newRequest
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    );
  }
}