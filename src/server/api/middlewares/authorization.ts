// src/server/api/middlewares/authorization.ts
import { NextRequest, NextResponse } from 'next/server';

export function checkPermission(requiredPermission: string) {
  return async function(req: NextRequest) {
    const user = (req as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Tratar admin como rol especial con todos los permisos
    if (user.roleId === 'role-admin') {
      return null; // Sin error, continuar
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
      return null; // Sin error, continuar
    }
    
    console.log(`Usuario ${user.id} no tiene permiso ${requiredPermission}`);
    console.log('Permisos disponibles:', permissions);
    
    return NextResponse.json(
      { error: 'No tiene permiso para esta acción' },
      { status: 403 }
    );
  };
}