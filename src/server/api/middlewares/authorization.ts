// src/server/api/middlewares/authorization.ts
import { NextRequest, NextResponse } from 'next/server';

// src/server/api/middlewares/authorization.ts
export function checkPermission(requiredPermission: string | string[]) {
  return async function(req: NextRequest) {
    const user = (req as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Restricción específica para ajuste de stock en rol fábrica
    if (user.roleId === 'role-fabrica' && 
      (requiredPermission === 'stock:ajustar' || 
       (Array.isArray(requiredPermission) && requiredPermission.includes('stock:ajustar')))) {
    
    // Permitir ajustes en el contexto de producciones o envíos
    const path = req.nextUrl.pathname;
    const isProductionOrShipping = path.includes('/produccion') || 
                                   path.includes('/envios');
    
    if (!isProductionOrShipping) {
      return NextResponse.json(
        { error: 'Como operador de fábrica, no puede ajustar el stock directamente. Debe utilizar el flujo de solicitud y recepción de insumos.' },
        { status: 403 }
      );
    }
  }
    
    // Tratar admin como rol especial con todos los permisos
    if (user.roleId === 'role-admin') {
      return null; // Sin error, continuar
    }

        
    // Para rol fábrica, permitir operaciones de producción y envíos
    if (user.roleId === 'role-fabrica') {
      const fabricaPermisos = [
        'produccion:crear', 'produccion:editar', 'produccion:ver',
        'envio:crear', 'envio:recibir', 'envio:enviar',
        'stock:ver'
      ];

      const permsToCheck = Array.isArray(requiredPermission) 
      ? requiredPermission 
      : [requiredPermission];
    
    if (permsToCheck.some(p => fabricaPermisos.includes(p))) {
      return null; // Permitir estas operaciones
    }
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
    const permissionsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    
    if (Array.isArray(permissions) && 
        (permissions.includes('*') || permissionsToCheck.some(perm => permissions.includes(perm)))) {
      return null; // Sin error, continuar
    }
    
    console.log(`Usuario ${user.id} no tiene permiso ${Array.isArray(requiredPermission) ? requiredPermission.join(' o ') : requiredPermission}`);
    console.log('Permisos disponibles:', permissions);
    
    return NextResponse.json(
      { error: 'No tiene permiso para esta acción' },
      { status: 403 }
    );
  };
}