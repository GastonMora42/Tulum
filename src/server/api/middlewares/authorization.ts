// src/server/api/middlewares/authorization.ts
import { NextRequest, NextResponse } from 'next/server';

export function checkRole(allowedRoles: string[]) {
  return function (req: NextRequest) {
    // Obtener usuario del request (añadido por authMiddleware)
    const user = (req as any).user;
    
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
    const user = (req as any).user;
    
    if (!user || !user.role) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Verificar si el rol tiene el permiso requerido
    const userPermissions = user.role.permissions as string[];
    if (!userPermissions.includes(requiredPermission)) {
      return NextResponse.json(
        { error: 'No tiene permiso para esta acción' },
        { status: 403 }
      );
    }
    
    // Permiso concedido, continuar
    return NextResponse.next();
  };
}