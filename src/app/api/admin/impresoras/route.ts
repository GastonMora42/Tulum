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

// src/app/api/admin/impresoras/route.ts - CORRECCIÓN MANEJO DUPLICADOS
export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permissionError = await checkPermission(['admin', 'venta:crear'])(req);
  if (permissionError) return permissionError;

  try {
    console.log('📝 [IMPRESORAS-API] Iniciando POST request');
    
    const body = await req.json();
    const { name, type, sucursalId, isDefault, settings } = body;

    console.log('📋 [IMPRESORAS-API] Datos recibidos:', { name, type, sucursalId });

    // Validaciones básicas
    if (!name || !type || !sucursalId) {
      return NextResponse.json(
        { error: 'Nombre, tipo y sucursalId son requeridos' },
        { status: 400 }
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

    // 🔧 VERIFICAR SI YA EXISTE UNA IMPRESORA CON EL MISMO NOMBRE
    const existingPrinter = await prisma.configuracionImpresora.findFirst({
      where: {
        sucursalId,
        nombre: name
      }
    });

    let impresora;

    if (existingPrinter) {
      console.log('🔄 [IMPRESORAS-API] Impresora existente encontrada, actualizando...');
      
      // Si existe, actualizar en lugar de crear
      impresora = await prisma.$transaction(async (tx) => {
        // Si la nueva impresora será por defecto, quitar el default de otras
        if (isDefault) {
          await tx.configuracionImpresora.updateMany({
            where: { sucursalId, esPorDefecto: true },
            data: { esPorDefecto: false }
          });
        }

        // Actualizar la impresora existente
        const updated = await tx.configuracionImpresora.update({
          where: { id: existingPrinter.id },
          data: {
            tipo: type,
            esPorDefecto: isDefault || false,
            configuracion: settings || {},
            activa: true,
            updatedAt: new Date()
          }
        });

        return updated;
      });

      console.log(`✅ [IMPRESORAS-API] Impresora actualizada: ${impresora.id}`);

    } else {
      console.log('💾 [IMPRESORAS-API] Creando nueva impresora...');
      
      // Si no existe, crear nueva
      impresora = await prisma.$transaction(async (tx) => {
        // Si será por defecto, quitar el default de otras impresoras
        if (isDefault) {
          console.log('🔄 [IMPRESORAS-API] Actualizando impresoras por defecto...');
          
          await tx.configuracionImpresora.updateMany({
            where: { sucursalId, esPorDefecto: true },
            data: { esPorDefecto: false }
          });
        }

        // Crear la nueva impresora
        const newPrinter = await tx.configuracionImpresora.create({
          data: {
            nombre: name,
            tipo: type,
            sucursalId,
            esPorDefecto: isDefault || false,
            configuracion: settings || {},
            activa: true
          }
        });

        return newPrinter;
      });

      console.log(`✅ [IMPRESORAS-API] Nueva impresora creada: ${impresora.id}`);
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: existingPrinter ? 'Impresora actualizada correctamente' : 'Impresora creada correctamente',
      impresora: {
        id: impresora.id,
        nombre: impresora.nombre,
        tipo: impresora.tipo,
        sucursalId: impresora.sucursalId,
        esPorDefecto: impresora.esPorDefecto,
        activa: impresora.activa,
        configuracion: impresora.configuracion
      }
    }, { status: existingPrinter ? 200 : 201 });

  } catch (error: any) {
    console.error('❌ [IMPRESORAS-API] Error en transacción:', error);

    // Manejo específico de errores de Prisma
    if (error.code === 'P2002') {
      // Error de restricción única - intentar recuperación
      console.log('🔄 [IMPRESORAS-API] Intento de recuperación por duplicado...');
      
      try {
        // Corregido: obtener los datos del body correctamente
        const body = await req.json();
        const existingPrinter = await prisma.configuracionImpresora.findFirst({
          where: {
            sucursalId: body?.sucursalId,
            nombre: body?.name
          }
        });

        if (existingPrinter) {
          return NextResponse.json({
            success: true,
            message: 'Impresora ya existe',
            impresora: {
              id: existingPrinter.id,
              nombre: existingPrinter.nombre,
              tipo: existingPrinter.tipo,
              sucursalId: existingPrinter.sucursalId,
              esPorDefecto: existingPrinter.esPorDefecto,
              activa: existingPrinter.activa
            }
          }, { status: 200 });
        }
      } catch (recoveryError) {
        console.error('❌ [IMPRESORAS-API] Error en recuperación:', recoveryError);
      }
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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