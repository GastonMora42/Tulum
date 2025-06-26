// src/server/api/middlewares/authorization.ts - VERSIÓN ACTUALIZADA CON PERMISOS DE RECEPCIÓN
import { NextRequest, NextResponse } from 'next/server';

export function checkPermission(requiredPermission: string | string[]) {
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

    // 🆕 MEJORADO: Para vendedores, permitir operaciones de caja, ventas Y RECEPCIÓN DE ENVÍOS
    if (user.roleId === 'role-vendedor') {
      const permsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const vendedorPermisos = [
        'caja:ver', 'caja:crear', 
        'venta:crear', 'venta:ver', 'venta:facturar', 
        'producto:ver', 'stock:ver', 
        'contingencia:crear',
        // 🆕 NUEVOS PERMISOS PARA RECEPCIÓN DE ENVÍOS
        'envio:recibir', 'envio:ver',
        'stock:ajustar_recepcion', // Permiso específico para ajustar stock en contexto de recepción
        'conciliacion:crear', 'conciliacion:ver', 'conciliacion:guardar'
      ];
      
      // Verificar si ALGUNO de los permisos coincide (OR en lugar de AND)
      if (permsToCheck.some(p => vendedorPermisos.includes(p))) {
        return null; // Permitir estas operaciones
      }
      
      // 🔧 LÓGICA ESPECIAL: Permitir ajuste de stock solo en contexto de recepción de envíos
      if (permsToCheck.includes('stock:ajustar')) {
        const path = req.nextUrl.pathname;
        const isReceivingContext = path.includes('/recibir') || 
                                  path.includes('/recepcion') ||
                                  req.headers.get('x-context') === 'envio-recepcion';
        
        if (isReceivingContext) {
          console.log(`[AUTH] Permitiendo ajuste de stock para vendedor en contexto de recepción: ${path}`);
          return null; // Permitir ajuste de stock en contexto de recepción
        } else {
          return NextResponse.json(
            { error: 'Como vendedor, solo puede ajustar stock en el contexto de recepción de envíos.' },
            { status: 403 }
          );
        }
      }
    }
        
    // Para rol fábrica, permitir operaciones de producción y envíos
    if (user.roleId === 'role-fabrica') {
      // Restricción específica para ajuste de stock en rol fábrica
      if (requiredPermission === 'stock:ajustar' || 
          (Array.isArray(requiredPermission) && requiredPermission.includes('stock:ajustar'))) {
        
        // Permitir ajustes en el contexto de producciones o envíos
        const path = req.nextUrl.pathname;
        const isProductionOrShipping = path.includes('/produccion') || 
                                       path.includes('/envios') ||
                                       req.headers.get('x-context') === 'produccion' ||
                                       req.headers.get('x-context') === 'envio';
        
        if (!isProductionOrShipping) {
          return NextResponse.json(
            { error: 'Como operador de fábrica, no puede ajustar el stock directamente. Debe utilizar el flujo de producción o envíos.' },
            { status: 403 }
          );
        }
      }

      const fabricaPermisos = [
        'produccion:crear', 'produccion:editar', 'produccion:ver',
        'envio:crear', 'envio:recibir', 'envio:enviar', 'envio:marcar_enviado',
        'stock:ver', 'stock:ajustar'
      ];

      const permsToCheck = Array.isArray(requiredPermission) 
        ? requiredPermission 
        : [requiredPermission];
    
      // Verificar si ALGUNO de los permisos coincide
      if (permsToCheck.some(p => fabricaPermisos.includes(p))) {
        return null; // Permitir estas operaciones
      }
    }
    
    // Para otros roles, verificar permiso específico en la base de datos
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
    
    // Verificar permiso wildcard o específico usando OR
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