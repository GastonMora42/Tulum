// src/server/api/middlewares/authorization.ts
import { NextRequest, NextResponse } from 'next/server';

// Extraer usuario de los headers
function getUserFromRequest(req: NextRequest) {
  try {
    // Primero, intentar obtener directamente si fue añadido a la request
    if ((req as any).user) {
      return (req as any).user;
    }
    
    // Si no está en la request, obtener de los headers
    const userData = req.headers.get('x-user-data');
    if (!userData) {
      return null;
    }
    
    return JSON.parse(userData);
  } catch (error) {
    console.error('Error al extraer usuario de los headers:', error);
    return null;
  }
}

export function checkRole(allowedRoles: string[]) {
  return function (req: NextRequest) {
    // Obtener usuario usando el helper
    const user = getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Verificar si el rol del usuario está permitido
    if (!allowedRoles.includes(user.roleId)) {
      return NextResponse.json(
        { error: 'No autorizado para esta acción' },
        { status: 403 }
      );
    }
    
    // Usuario autorizado, continuar
    return NextResponse.next();
  };
}

// Helper para verificar permisos específicos
export function checkPermission(requiredPermission: string) {
  return function (req: NextRequest) {
    // Obtener usuario usando el helper
    const user = getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Tratar admin como rol especial con todos los permisos
    if (user.roleId === 'role-admin') {
      return NextResponse.next();
    }
    
    // Para otros roles, verificar permiso específico
    if (!user.role || !user.role.permissions) {
      console.error('No se encontraron permisos para el usuario:', user.id);
      return NextResponse.json(
        { error: 'No tiene permiso para esta acción' },
        { status: 403 }
      );
    }
    
    // Convertir permisos a array si viene como string (JSON)
    let permissions = user.role.permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (e) {
        console.error('Error al parsear permisos:', e);
        return NextResponse.json(
          { error: 'Error en permisos de usuario' },
          { status: 500 }
        );
      }
    }
    
    // Verificar permiso wildcard o específico
    if (Array.isArray(permissions) && 
        (permissions.includes('*') || permissions.includes(requiredPermission))) {
      return NextResponse.next();
    }
    
    console.log(`Usuario ${user.id} no tiene permiso ${requiredPermission}`);
    console.log('Permisos disponibles:', permissions);
    
    return NextResponse.json(
      { error: 'No tiene permiso para esta acción' },
      { status: 403 }
    );
  };
}