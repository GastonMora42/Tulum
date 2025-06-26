// src/app/api/pdv/conciliacion/route.ts - VERSIÓN COMPLETAMENTE ROBUSTA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    const categoriaId = searchParams.get('categoriaId'); // Opcional
    
    console.log(`[API Conciliación GET] Iniciando para sucursal: ${sucursalId}, categoría: ${categoriaId || 'todas'}`);
    
    if (!sucursalId) {
      console.error('[API Conciliación GET] Error: sucursalId no proporcionado');
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      console.error(`[API Conciliación GET] Error de permisos: usuario ${user.id} intentando acceder a sucursal ${sucursalId}`);
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a esta sucursal' },
        { status: 403 }
      );
    }
    
    // PASO 1: Verificar contingencias
    console.log('[API Conciliación GET] Verificando contingencias...');
    let contingenciasBloqueo: any[] = [];
    
    try {
      if (categoriaId) {
        // Buscar contingencias específicas de esta categoría
        contingenciasBloqueo = await prisma.contingencia.findMany({
          where: {
            ubicacionId: sucursalId,
            tipo: 'conciliacion',
            estado: { in: ['pendiente', 'en_revision'] },
            OR: [
              { descripcion: { contains: `Categoría: ${categoriaId}` } },
              { descripcion: { contains: `categoriaId-${categoriaId}` } }
            ]
          }
        });
      } else {
        // Para vista general, buscar contingencias que puedan bloquear
        contingenciasBloqueo = await prisma.contingencia.findMany({
          where: {
            ubicacionId: sucursalId,
            OR: [
              { tipo: 'conciliacion_general' },
              { tipo: 'conciliacion' }
            ],
            estado: { in: ['pendiente', 'en_revision'] }
          }
        });
      }
      
      console.log(`[API Conciliación GET] Contingencias encontradas: ${contingenciasBloqueo.length}`);
      
    } catch (contingenciaError) {
      console.error('[API Conciliación GET] Error al verificar contingencias:', contingenciaError);
      // No bloquear por error en contingencias, continuar
    }
    
    if (contingenciasBloqueo.length > 0) {
      console.log('[API Conciliación GET] Contingencias bloquean la conciliación');
      let mensajeBloqueo = '';
      
      if (categoriaId) {
        try {
          const categoria = await prisma.categoria.findUnique({
            where: { id: categoriaId },
            select: { nombre: true }
          });
          const nombreCategoria = categoria?.nombre || 'Categoría desconocida';
          mensajeBloqueo = `La categoría "${nombreCategoria}" tiene una contingencia de conciliación pendiente.`;
        } catch {
          mensajeBloqueo = `La categoría seleccionada tiene una contingencia de conciliación pendiente.`;
        }
      } else {
        mensajeBloqueo = `Existen ${contingenciasBloqueo.length} contingencia(s) de conciliación pendiente(s).`;
      }
      
      return NextResponse.json(
        { 
          error: mensajeBloqueo,
          categoriaAfectada: categoriaId,
          contingencias: contingenciasBloqueo.map(c => ({
            id: c.id,
            titulo: c.titulo,
            fechaCreacion: c.fechaCreacion,
            tipo: c.tipo
          }))
        },
        { status: 409 }
      );
    }
    
    // PASO 2: Buscar conciliación activa
    console.log('[API Conciliación GET] Buscando conciliación activa...');
    let conciliacionActiva = null;
    
    try {
      let whereCondition: any = {
        sucursalId, 
        estado: { in: ['pendiente', 'en_proceso'] }
      };
      
      if (categoriaId) {
        // Para categoría específica
        whereCondition.observaciones = { 
          OR: [
            { contains: `Categoría: ${categoriaId}` },
            { contains: `categoriaId-${categoriaId}` }
          ]
        };
      }
      
      conciliacionActiva = await prisma.conciliacion.findFirst({
        where: whereCondition,
        orderBy: { fecha: 'desc' }
      });
      
      console.log(`[API Conciliación GET] Conciliación activa: ${conciliacionActiva ? conciliacionActiva.id : 'ninguna'}`);
      
    } catch (conciliacionError) {
      console.error('[API Conciliación GET] Error al buscar conciliación activa:', conciliacionError);
      throw new Error('Error en base de datos al buscar conciliación activa');
    }
    
    if (!conciliacionActiva) {
      console.log('[API Conciliación GET] No se encontró conciliación activa');
      return NextResponse.json(
        { message: categoriaId ? 'No hay conciliación activa para esta categoría' : 'No hay conciliación activa' },
        { status: 404 }
      );
    }
    
    // PASO 3: Obtener productos
    console.log('[API Conciliación GET] Obteniendo productos...');
    let productos = [];
    
    try {
      const whereStockCondition: any = {
        ubicacionId: sucursalId,
        productoId: { not: null }
      };
      
      // Solo filtrar por categoría si se especifica
      if (categoriaId) {
        whereStockCondition.producto = {
          categoriaId: categoriaId
        };
      }
      
      productos = await prisma.stock.findMany({
        where: whereStockCondition,
        include: {
          producto: {
            include: {
              categoria: true
            }
          }
        }
      });
      
      console.log(`[API Conciliación GET] Productos encontrados: ${productos.length}`);
      
    } catch (productosError) {
      console.error('[API Conciliación GET] Error al obtener productos:', productosError);
      throw new Error('Error en base de datos al obtener productos');
    }
    
    // PASO 4: Formatear respuesta
    console.log('[API Conciliación GET] Formateando respuesta...');
    const formattedData = {
      id: conciliacionActiva.id,
      fecha: conciliacionActiva.fecha,
      estado: conciliacionActiva.estado,
      usuario: conciliacionActiva.usuarioId,
      categoriaId: categoriaId || null,
      productos: productos.map(stock => {
        let stockFisico = null;
        
        try {
          if (conciliacionActiva.detalles) {
            const detalles = typeof conciliacionActiva.detalles === 'string' 
              ? JSON.parse(conciliacionActiva.detalles) 
              : conciliacionActiva.detalles;
              
            if (Array.isArray(detalles)) {
              const item = detalles.find((d: any) => d.productoId === stock.productoId);
              if (item && typeof item.stockFisico === 'number') {
                stockFisico = item.stockFisico;
              }
            }
          }
        } catch (detallesError) {
          console.warn(`[API Conciliación GET] Error procesando detalles para producto ${stock.productoId}:`, detallesError);
        }
        
        return {
          id: stock.productoId || 'unknown',
          nombre: stock.producto?.nombre || 'Producto desconocido',
          stockTeorico: stock.cantidad,
          stockFisico: stockFisico,
          diferencia: stockFisico !== null ? stockFisico - stock.cantidad : 0,
          categoriaId: stock.producto?.categoriaId || 'sin-categoria',
          categoria: {
            id: stock.producto?.categoria?.id || 'sin-categoria',
            nombre: stock.producto?.categoria?.nombre || 'Sin categoría'
          }
        };
      })
    };
    
    console.log(`[API Conciliación GET] Respuesta formateada exitosamente`);
    return NextResponse.json(formattedData);
    
  } catch (error: any) {
    console.error('[API Conciliación GET] Error completo:', error);
    console.error('[API Conciliación GET] Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || 'Error interno del servidor al obtener conciliación',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { sucursalId, categoriaId } = body;
    
    console.log(`[API Conciliación POST] Iniciando creación para sucursal: ${sucursalId}, categoría: ${categoriaId || 'todas'}`);
    
    if (!sucursalId) {
      console.error('[API Conciliación POST] Error: sucursalId no proporcionado');
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      console.error(`[API Conciliación POST] Error de permisos: usuario ${user.id} intentando crear en sucursal ${sucursalId}`);
      return NextResponse.json(
        { error: 'No tiene permisos para crear conciliaciones en esta sucursal' },
        { status: 403 }
      );
    }
    
    // PASO 1: Verificar contingencias (similar al GET)
    console.log('[API Conciliación POST] Verificando contingencias...');
    let contingenciasBloqueo: any[] = [];
    
    try {
      if (categoriaId) {
        contingenciasBloqueo = await prisma.contingencia.findMany({
          where: {
            ubicacionId: sucursalId,
            tipo: 'conciliacion',
            estado: { in: ['pendiente', 'en_revision'] },
            OR: [
              { descripcion: { contains: `Categoría: ${categoriaId}` } },
              { descripcion: { contains: `categoriaId-${categoriaId}` } }
            ]
          }
        });
      } else {
        contingenciasBloqueo = await prisma.contingencia.findMany({
          where: {
            ubicacionId: sucursalId,
            tipo: 'conciliacion_general',
            estado: { in: ['pendiente', 'en_revision'] }
          }
        });
      }
    } catch (contingenciaError) {
      console.error('[API Conciliación POST] Error verificando contingencias:', contingenciaError);
      // Continuar sin bloquear
    }
    
    if (contingenciasBloqueo.length > 0) {
      console.log('[API Conciliación POST] Contingencias bloquean la creación');
      return NextResponse.json({
        error: categoriaId 
          ? `La categoría tiene una contingencia pendiente`
          : 'Existe una contingencia de conciliación general pendiente',
        categoriaAfectada: categoriaId,
        contingencias: contingenciasBloqueo.map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaCreacion: c.fechaCreacion
        }))
      }, { status: 409 });
    }
    
    // PASO 2: Verificar conciliación existente
    console.log('[API Conciliación POST] Verificando conciliación existente...');
    let conciliacionExistente = null;
    
    try {
      let whereCondition: any = {
        sucursalId,
        estado: { in: ['pendiente', 'en_proceso'] }
      };
      
      if (categoriaId) {
        whereCondition.observaciones = { 
          OR: [
            { contains: `Categoría: ${categoriaId}` },
            { contains: `categoriaId-${categoriaId}` }
          ]
        };
      }
      
      conciliacionExistente = await prisma.conciliacion.findFirst({
        where: whereCondition
      });
      
    } catch (existenteError) {
      console.error('[API Conciliación POST] Error verificando conciliación existente:', existenteError);
      throw new Error('Error en base de datos al verificar conciliación existente');
    }
    
    if (conciliacionExistente) {
      console.log(`[API Conciliación POST] Conciliación existente encontrada: ${conciliacionExistente.id}`);
      return NextResponse.json({
        id: conciliacionExistente.id,
        fecha: conciliacionExistente.fecha,
        estado: conciliacionExistente.estado,
        categoriaId: categoriaId || null,
        message: categoriaId 
          ? 'Ya existe una conciliación en proceso para esta categoría'
          : 'Ya existe una conciliación en proceso'
      });
    }
    
    // PASO 3: Obtener información de categoría
    let categoriaNombre = '';
    if (categoriaId) {
      try {
        const categoria = await prisma.categoria.findUnique({
          where: { id: categoriaId }
        });
        categoriaNombre = categoria?.nombre || 'Categoría desconocida';
      } catch (categoriaError) {
        console.warn('[API Conciliación POST] Error obteniendo categoría:', categoriaError);
        categoriaNombre = 'Categoría desconocida';
      }
    }
    
    // PASO 4: Obtener productos
    console.log('[API Conciliación POST] Obteniendo productos...');
    let productos = [];
    
    try {
      const whereStockCondition: any = {
        ubicacionId: sucursalId,
        productoId: { not: null }
      };
      
      if (categoriaId) {
        whereStockCondition.producto = {
          categoriaId: categoriaId
        };
      }
      
      productos = await prisma.stock.findMany({
        where: whereStockCondition,
        include: {
          producto: {
            include: {
              categoria: true
            }
          }
        }
      });
      
      console.log(`[API Conciliación POST] Productos encontrados: ${productos.length}`);
      
    } catch (productosError) {
      console.error('[API Conciliación POST] Error obteniendo productos:', productosError);
      throw new Error('Error en base de datos al obtener productos');
    }
    
    // PASO 5: Crear nueva conciliación
    console.log('[API Conciliación POST] Creando nueva conciliación...');
    
    try {
      const currentDate = new Date();
      const timestamp = format(currentDate, 'yyyyMMdd-HHmmss');
      const conciliacionId = categoriaId 
        ? `conciliacion-${timestamp}-${sucursalId.slice(-6)}-${categoriaId.slice(-6)}`
        : `conciliacion-${timestamp}-${sucursalId.slice(-6)}`;
      
      const observacionesBase = categoriaId 
        ? `Conciliación de categoría: ${categoriaNombre} | categoriaId-${categoriaId} | Categoría: ${categoriaId}`
        : 'Conciliación general de inventario';
      
      const nuevaConciliacion = await prisma.conciliacion.create({
        data: {
          id: conciliacionId,
          sucursalId,
          fecha: currentDate,
          estado: 'pendiente',
          usuarioId: user.id,
          observaciones: observacionesBase,
          detalles: []
        }
      });
      
      console.log(`[API Conciliación POST] Nueva conciliación creada: ${nuevaConciliacion.id}`);
      
      // PASO 6: Formatear respuesta
      const formattedData = {
        id: nuevaConciliacion.id,
        fecha: nuevaConciliacion.fecha,
        estado: nuevaConciliacion.estado,
        usuario: user.id,
        categoriaId: categoriaId || null,
        productos: productos.map(stock => ({
          id: stock.productoId || 'unknown',
          nombre: stock.producto?.nombre || 'Producto desconocido',
          stockTeorico: stock.cantidad,
          stockFisico: null,
          diferencia: 0,
          categoriaId: stock.producto?.categoriaId || 'sin-categoria',
          categoria: {
            id: stock.producto?.categoria?.id || 'sin-categoria',
            nombre: stock.producto?.categoria?.nombre || 'Sin categoría'
          }
        }))
      };
      
      console.log(`[API Conciliación POST] Respuesta formateada exitosamente`);
      return NextResponse.json(formattedData);
      
    } catch (createError) {
      console.error('[API Conciliación POST] Error creando conciliación:', createError);
      throw new Error('Error en base de datos al crear conciliación');
    }
    
  } catch (error: any) {
    console.error('[API Conciliación POST] Error completo:', error);
    console.error('[API Conciliación POST] Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || 'Error interno del servidor al crear conciliación',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}