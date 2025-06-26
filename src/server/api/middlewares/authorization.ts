// src/server/api/middlewares/authorization.ts - VERSIÓN CORREGIDA PARA RECEPCIÓN DE ENVÍOS
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
    
    // 🆕 ADMINISTRADORES: Acceso total a todas las operaciones
    if (user.roleId === 'role-admin') {
      console.log(`[AUTH] Admin ${user.email} - Acceso garantizado a: ${Array.isArray(requiredPermission) ? requiredPermission.join(', ') : requiredPermission}`);
      return null; // Sin error, continuar
    }

    // 🆕 VENDEDORES: Permisos específicos para operaciones de PDV y recepción
    if (user.roleId === 'role-vendedor') {
      const permsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const vendedorPermisos = [
        // Operaciones de caja
        'caja:ver', 'caja:crear', 'caja:cerrar',
        
        // Operaciones de venta
        'venta:crear', 'venta:ver', 'venta:facturar', 'venta:cancelar',
        
        // Consulta de productos y stock
        'producto:ver', 'stock:ver', 
        
        // 🆕 RECEPCIÓN DE ENVÍOS - PERMISOS CLAVE CORREGIDOS
        'envio:recibir', 'envio:ver', 'envio:listar',
        
        // 🔧 PERMISOS DE STOCK EN CONTEXTO DE RECEPCIÓN
        'stock:ajustar_recepcion', 'stock:ajustar',
        
        // Contingencias
        'contingencia:crear', 'contingencia:ver',
        
        // Conciliaciones
        'conciliacion:crear', 'conciliacion:ver', 'conciliacion:guardar'
      ];
      
      // Verificar si ALGUNO de los permisos coincide (OR en lugar de AND)
      if (permsToCheck.some(p => vendedorPermisos.includes(p))) {
        console.log(`[AUTH] Vendedor ${user.email} - Permiso concedido para: ${permsToCheck.join(', ')}`);
        return null; // Permitir estas operaciones
      }
      
      // 🔧 LÓGICA ESPECIAL: Permitir ajuste de stock en contexto de recepción de envíos
      if (permsToCheck.includes('stock:ajustar')) {
        const path = req.nextUrl.pathname;
        const contextHeader = req.headers.get('x-context');
        
        // Verificar contextos válidos para vendedores
        const isReceivingContext = path.includes('/recibir') || 
                                  path.includes('/recepcion') ||
                                  contextHeader === 'envio-recepcion' ||
                                  contextHeader === 'pdv-recepcion';
        
        if (isReceivingContext) {
          console.log(`[AUTH] Vendedor ${user.email} - Permiso especial para ajuste de stock en contexto de recepción: ${path} (context: ${contextHeader})`);
          return null; // Permitir ajuste de stock en contexto de recepción
        } else {
          console.log(`[AUTH] Vendedor ${user.email} - Denegado ajuste de stock fuera de contexto de recepción (path: ${path}, context: ${contextHeader})`);
          return NextResponse.json(
            { 
              error: 'Como vendedor, solo puede ajustar stock en el contexto de recepción de envíos.',
              details: {
                path,
                context: contextHeader,
                allowedContexts: ['envio-recepcion', 'pdv-recepcion']
              }
            },
            { status: 403 }
          );
        }
      }
      
      // Si llega aquí, el permiso no está en la lista de vendedor
      console.log(`[AUTH] Vendedor ${user.email} - Permiso denegado para: ${permsToCheck.join(', ')}`);
      return NextResponse.json(
        { 
          error: 'No tiene permisos suficientes para esta operación',
          details: {
            rol: 'vendedor',
            permisosRequeridos: permsToCheck,
            permisosDisponibles: vendedorPermisos.slice(0, 10) // Solo mostrar algunos para no saturar
          }
        },
        { status: 403 }
      );
    }
        
    // 🆕 OPERADORES DE FÁBRICA: Permisos para producción y envíos
    if (user.roleId === 'role-fabrica') {
      const permsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      
      // Restricción específica para ajuste de stock en rol fábrica
      if (permsToCheck.includes('stock:ajustar')) {
        const path = req.nextUrl.pathname;
        const contextHeader = req.headers.get('x-context');
        
        const isProductionOrShipping = path.includes('/produccion') || 
                                       path.includes('/envios') ||
                                       contextHeader === 'produccion' ||
                                       contextHeader === 'envio' ||
                                       contextHeader === 'fabrica-produccion';
        
        if (!isProductionOrShipping) {
          console.log(`[AUTH] Operador fábrica ${user.email} - Denegado ajuste directo de stock`);
          return NextResponse.json(
            { error: 'Como operador de fábrica, no puede ajustar el stock directamente. Debe utilizar el flujo de producción o envíos.' },
            { status: 403 }
          );
        }
      }

      const fabricaPermisos = [
        // Operaciones de producción
        'produccion:crear', 'produccion:editar', 'produccion:ver', 'produccion:finalizar',
        
        // Operaciones de envío desde fábrica
        'envio:crear', 'envio:recibir', 'envio:enviar', 'envio:marcar_enviado', 'envio:ver',
        
        // Consulta y ajuste de stock (en contexto)
        'stock:ver', 'stock:ajustar',
        
        // Insumos y materias primas
        'insumo:ver', 'insumo:crear', 'insumo:editar',
        
        // Contingencias relacionadas con producción
        'contingencia:crear', 'contingencia:ver'
      ];

      // Verificar si ALGUNO de los permisos coincide
      if (permsToCheck.some(p => fabricaPermisos.includes(p))) {
        console.log(`[AUTH] Operador fábrica ${user.email} - Permiso concedido para: ${permsToCheck.join(', ')}`);
        return null; // Permitir estas operaciones
      }
      
      console.log(`[AUTH] Operador fábrica ${user.email} - Permiso denegado para: ${permsToCheck.join(', ')}`);
      return NextResponse.json(
        { 
          error: 'No tiene permisos para esta operación como operador de fábrica',
          details: {
            rol: 'fabrica',
            permisosRequeridos: permsToCheck,
            permisosDisponibles: fabricaPermisos.slice(0, 10)
          }
        },
        { status: 403 }
      );
    }
    
    // Para otros roles, verificar permiso específico en la base de datos
    if (!user.role || !user.role.permissions) {
      console.error(`[AUTH] No se encontraron permisos para el usuario: ${user.id} (rol: ${user.roleId})`);
      return NextResponse.json(
        { error: 'No tiene permiso para esta acción - configuración de rol inválida' },
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
          { error: 'Error en permisos de usuario - formato inválido' },
          { status: 500 }
        );
      }
    }
    
    // Verificar permiso wildcard o específico usando OR
    const permissionsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    
    if (Array.isArray(permissions) && 
        (permissions.includes('*') || permissionsToCheck.some(perm => permissions.includes(perm)))) {
      console.log(`[AUTH] Usuario ${user.email} - Permiso concedido por configuración de rol`);
      return null; // Sin error, continuar
    }
    
    console.log(`[AUTH] Usuario ${user.id} (${user.roleId}) - ACCESO DENEGADO`);
    console.log(`[AUTH] Permisos requeridos: ${Array.isArray(requiredPermission) ? requiredPermission.join(' o ') : requiredPermission}`);
    console.log(`[AUTH] Permisos disponibles:`, permissions);
    
    return NextResponse.json(
      { 
        error: 'No tiene permiso para esta acción',
        details: {
          required: Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission],
          role: user.roleId,
          available: Array.isArray(permissions) ? permissions : []
        }
      },
      { status: 403 }
    );
  };
}