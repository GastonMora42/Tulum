// src/app/api/admin/impresoras/route.ts - VERSIÓN CORREGIDA
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  try {
    // 🔧 CORRECCIÓN: Manejo de errores más robusto
    console.log('📋 [IMPRESORAS-API] Iniciando GET request');
    
    const authError = await authMiddleware(req);
    if (authError) {
      console.error('❌ [IMPRESORAS-API] Error de autenticación');
      return authError;
    }

    const permissionError = await checkPermission(['admin', 'venta:ver'])(req);
    if (permissionError) {
      console.error('❌ [IMPRESORAS-API] Error de permisos');
      return permissionError;
    }

    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    const user = (req as any).user;
    console.log(`👤 [IMPRESORAS-API] Usuario: ${user?.email}, Sucursal solicitada: ${sucursalId}`);
    
    // 🔧 CORRECCIÓN: Validación más estricta de parámetros
    if (!user) {
      console.error('❌ [IMPRESORAS-API] Usuario no encontrado en request');
      return NextResponse.json(
        { error: 'Usuario no autenticado correctamente' },
        { status: 401 }
      );
    }
    
    // Construir filtro con validaciones
    const where: any = { activa: true };
    
    try {
      if (sucursalId) {
        // Verificar que la sucursal existe
        const sucursalExists = await prisma.ubicacion.findUnique({
          where: { id: sucursalId },
          select: { id: true, nombre: true }
        });
        
        if (!sucursalExists) {
          console.warn(`⚠️ [IMPRESORAS-API] Sucursal ${sucursalId} no encontrada`);
          return NextResponse.json(
            { error: 'Sucursal no encontrada' },
            { status: 404 }
          );
        }
        
        where.sucursalId = sucursalId;
        console.log(`🏢 [IMPRESORAS-API] Filtrando por sucursal: ${sucursalExists.nombre}`);
      } else if (user.sucursalId && user.roleId !== 'role-admin') {
        // Usuario no admin, limitar a su sucursal
        where.sucursalId = user.sucursalId;
        console.log(`🔒 [IMPRESORAS-API] Usuario limitado a su sucursal: ${user.sucursalId}`);
      }

      // 🔧 CORRECCIÓN: Query con manejo de errores
      console.log('🔍 [IMPRESORAS-API] Ejecutando query a BD...');
      
      const impresoras = await prisma.configuracionImpresora.findMany({
        where,
        include: {
          sucursal: {
            select: {
              id: true,
              nombre: true,
              tipo: true
            }
          }
        },
        orderBy: [
          { esPorDefecto: 'desc' },
          { nombre: 'asc' }
        ]
      });

      console.log(`✅ [IMPRESORAS-API] Encontradas ${impresoras.length} impresoras`);

      // 🔧 CORRECCIÓN: Transformación segura con validaciones
      const formattedPrinters = impresoras.map((imp) => {
        try {
          // Validar que la configuración sea un objeto válido
          let settings = {};
          if (imp.configuracion) {
            if (typeof imp.configuracion === 'string') {
              try {
                settings = JSON.parse(imp.configuracion);
              } catch (parseError) {
                console.warn(`⚠️ [IMPRESORAS-API] Error parseando configuración de ${imp.nombre}:`, parseError);
                settings = {};
              }
            } else if (typeof imp.configuracion === 'object') {
              settings = imp.configuracion;
            }
          }

          return {
            id: imp.id,
            name: imp.nombre || 'Impresora sin nombre',
            type: imp.tipo || 'thermal',
            sucursalId: imp.sucursalId,
            isDefault: Boolean(imp.esPorDefecto),
            settings: {
              isOnline: true, // Por defecto asumir que está online
              paperWidth: 80, // Valor por defecto
              autocut: true,  // Valor por defecto
              encoding: 'utf-8', // Valor por defecto
              ...settings // Sobrescribir con configuración real si existe
            },
            sucursal: imp.sucursal?.nombre || 'Sucursal no encontrada',
            createdAt: imp.createdAt,
            updatedAt: imp.updatedAt
          };
        } catch (transformError) {
          console.error(`❌ [IMPRESORAS-API] Error transformando impresora ${imp.id}:`, transformError);
          
          // Retornar configuración mínima en caso de error
          return {
            id: imp.id,
            name: imp.nombre || 'Impresora con errores',
            type: 'thermal',
            sucursalId: imp.sucursalId,
            isDefault: false,
            settings: {
              isOnline: false,
              paperWidth: 80,
              autocut: true,
              encoding: 'utf-8'
            },
            sucursal: 'Error en configuración',
            error: 'Error en configuración'
          };
        }
      });

      console.log(`📤 [IMPRESORAS-API] Retornando ${formattedPrinters.length} impresoras formateadas`);

      return NextResponse.json(formattedPrinters, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

    } catch (dbError) {
      console.error('❌ [IMPRESORAS-API] Error en base de datos:', dbError);
      
      // Intentar reconectar y reintentar una vez
      try {
        console.log('🔄 [IMPRESORAS-API] Intentando reconectar a BD...');
        await prisma.$disconnect();
        await prisma.$connect();
        
        // Reintento simplificado
        const impresoras = await prisma.configuracionImpresora.findMany({
          where: { activa: true },
          include: {
            sucursal: {
              select: { id: true, nombre: true }
            }
          },
          take: 50 // Limitar para evitar timeouts
        });
        
        const simpleFormatted = impresoras.map(imp => ({
          id: imp.id,
          name: imp.nombre,
          type: imp.tipo,
          sucursalId: imp.sucursalId,
          isDefault: imp.esPorDefecto,
          settings: { isOnline: true, paperWidth: 80, autocut: true },
          sucursal: imp.sucursal?.nombre || 'N/A'
        }));
        
        console.log(`✅ [IMPRESORAS-API] Reintento exitoso: ${simpleFormatted.length} impresoras`);
        return NextResponse.json(simpleFormatted);
        
      } catch (retryError) {
        console.error('❌ [IMPRESORAS-API] Fallo también en reintento:', retryError);
      }
      
      // Si todo falla, retornar array vacío con error
      return NextResponse.json(
        { 
          error: 'Error interno del servidor',
          details: dbError instanceof Error ? dbError.message : 'Error de base de datos',
          impresoras: [] // Array vacío para evitar que el frontend se rompa
        },
        { status: 500 }
      );
    }

  } catch (generalError) {
    console.error('❌ [IMPRESORAS-API] Error general:', generalError);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: generalError instanceof Error ? generalError.message : 'Error desconocido',
        impresoras: [] // Siempre retornar estructura esperada
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('📝 [IMPRESORAS-API] Iniciando POST request');
    
    const authError = await authMiddleware(req);
    if (authError) return authError;

    const permissionError = await checkPermission(['admin', 'venta:crear'])(req);
    if (permissionError) return permissionError;

    const body = await req.json();
    console.log('📋 [IMPRESORAS-API] Datos recibidos:', { 
      name: body.name, 
      type: body.type, 
      sucursalId: body.sucursalId 
    });

    // 🔧 CORRECCIÓN: Validaciones más estrictas
    const { name, type, sucursalId, isDefault, settings } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nombre de impresora es requerido y no puede estar vacío' },
        { status: 400 }
      );
    }

    if (!type || !['thermal', 'laser', 'inkjet'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de impresora debe ser: thermal, laser o inkjet' },
        { status: 400 }
      );
    }

    if (!sucursalId || typeof sucursalId !== 'string') {
      return NextResponse.json(
        { error: 'ID de sucursal es requerido' },
        { status: 400 }
      );
    }

    const user = (req as any).user;
    
    // Verificar acceso a la sucursal
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para configurar impresoras en esta sucursal' },
        { status: 403 }
      );
    }

    // Verificar que la sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId },
      select: { id: true, nombre: true }
    });

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    console.log(`🏢 [IMPRESORAS-API] Sucursal validada: ${sucursal.nombre}`);

    // 🔧 CORRECCIÓN: Manejo de impresora por defecto en transacción
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Si es por defecto, quitar el flag de otras impresoras de la misma sucursal
        if (isDefault) {
          console.log('🔄 [IMPRESORAS-API] Actualizando impresoras por defecto...');
          await tx.configuracionImpresora.updateMany({
            where: { 
              sucursalId,
              activa: true
            },
            data: { esPorDefecto: false }
          });
        }

        // Preparar configuración con valores por defecto
        const defaultSettings = {
          isOnline: true,
          paperWidth: 80,
          autocut: true,
          encoding: 'utf-8'
        };

        const finalSettings = { ...defaultSettings, ...settings };

        console.log('💾 [IMPRESORAS-API] Creando nueva impresora...');
        
        // Crear nueva impresora
        const nuevaImpresora = await tx.configuracionImpresora.create({
          data: {
            nombre: name.trim(),
            tipo: type,
            sucursalId,
            esPorDefecto: Boolean(isDefault),
            configuracion: finalSettings,
            activa: true
          },
          include: {
            sucursal: {
              select: { id: true, nombre: true }
            }
          }
        });

        return nuevaImpresora;
      });

      console.log(`✅ [IMPRESORAS-API] Impresora creada: ${result.nombre}`);

      const responseData = {
        id: result.id,
        name: result.nombre,
        type: result.tipo,
        sucursalId: result.sucursalId,
        isDefault: result.esPorDefecto,
        settings: result.configuracion,
        sucursal: result.sucursal?.nombre || 'N/A',
        createdAt: result.createdAt
      };

      return NextResponse.json(responseData, { status: 201 });

    } catch (transactionError) {
      console.error('❌ [IMPRESORAS-API] Error en transacción:', transactionError);
      
      return NextResponse.json(
        { 
          error: 'Error al crear configuración de impresora',
          details: transactionError instanceof Error ? transactionError.message : 'Error de transacción'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [IMPRESORAS-API] Error general en POST:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// 🆕 NUEVO: Endpoint para verificar estado de impresoras
export async function PATCH(req: NextRequest) {
  try {
    console.log('🔧 [IMPRESORAS-API] Iniciando PATCH request');
    
    const authError = await authMiddleware(req);
    if (authError) return authError;

    const permissionError = await checkPermission(['admin', 'venta:crear'])(req);
    if (permissionError) return permissionError;

    const body = await req.json();
    const { action, printerIds, settings } = body;

    if (action === 'test_connectivity') {
      // Simular test de conectividad
      const results = [];
      
      for (const printerId of printerIds || []) {
        const printer = await prisma.configuracionImpresora.findUnique({
          where: { id: printerId }
        });
        
        if (printer) {
          results.push({
            id: printerId,
            name: printer.nombre,
            online: true, // En implementación real, probar conectividad real
            lastTest: new Date()
          });
        }
      }
      
      return NextResponse.json({ results });
    }

    if (action === 'update_settings') {
      // Actualizar configuraciones en lote
      const updated = await prisma.configuracionImpresora.updateMany({
        where: { 
          id: { in: printerIds || [] },
          activa: true
        },
        data: {
          configuracion: settings,
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({ updated: updated.count });
    }

    return NextResponse.json(
      { error: 'Acción no soportada' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ [IMPRESORAS-API] Error en PATCH:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}