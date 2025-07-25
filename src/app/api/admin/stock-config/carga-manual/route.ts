// src/app/api/admin/stock-config/carga-manual/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockService } from '@/server/services/stock/stockService';
import { stockSucursalService } from '@/server/services/stock/stockSucursalService';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const body = await req.json();
    const user = (req as any).user;
    
    const { 
      productoId, 
      sucursalId, 
      cantidad, 
      observaciones = '',
      modo = 'incrementar' // incrementar, establecer, decrementar
    } = body;

    console.log(`[CARGA-MANUAL] Iniciando carga manual: ${cantidad} unidades de producto ${productoId} en sucursal ${sucursalId}`);

    // Validaciones básicas
    if (!productoId || !sucursalId || !cantidad || cantidad <= 0) {
      return NextResponse.json(
        { error: 'Producto, sucursal y cantidad son requeridos y la cantidad debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que el producto existe y está activo
    const producto = await prisma.producto.findUnique({
      where: { id: productoId, activo: true },
      include: { categoria: true }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Verificar que la sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    console.log(`[CARGA-MANUAL] ✅ Validaciones pasadas: ${producto.nombre} en ${sucursal.nombre}`);

    // Obtener stock actual antes del ajuste
    const stockAnterior = await prisma.stock.findFirst({
      where: {
        productoId,
        ubicacionId: sucursalId
      }
    });

    const cantidadAnterior = stockAnterior?.cantidad || 0;
    console.log(`[CARGA-MANUAL] Stock anterior: ${cantidadAnterior}`);

    // Calcular el ajuste según el modo
    let cantidadAjuste = 0;
    let cantidadFinal = 0;

    switch (modo) {
      case 'incrementar':
        cantidadAjuste = cantidad;
        cantidadFinal = cantidadAnterior + cantidad;
        break;
      case 'establecer':
        cantidadAjuste = cantidad - cantidadAnterior;
        cantidadFinal = cantidad;
        break;
      case 'decrementar':
        cantidadAjuste = -cantidad;
        cantidadFinal = Math.max(0, cantidadAnterior - cantidad);
        break;
      default:
        return NextResponse.json(
          { error: 'Modo de carga inválido. Use: incrementar, establecer o decrementar' },
          { status: 400 }
        );
    }

    console.log(`[CARGA-MANUAL] Cálculo de ajuste: ${cantidadAnterior} -> ${cantidadFinal} (ajuste: ${cantidadAjuste})`);

    // Realizar el ajuste de stock
    let resultadoAjuste;
    if (cantidadAjuste !== 0) {
      try {
        resultadoAjuste = await stockService.ajustarStock({
          productoId,
          ubicacionId: sucursalId,
          cantidad: cantidadAjuste,
          motivo: `Carga manual: ${observaciones || 'Ajuste desde dashboard'}`,
          usuarioId: user.id,
          allowNegative: true // Admins pueden hacer ajustes que resulten en negativo
        });

        console.log(`[CARGA-MANUAL] ✅ Stock ajustado exitosamente`);
      } catch (stockError) {
        console.error(`[CARGA-MANUAL] ❌ Error ajustando stock:`, stockError);
        return NextResponse.json(
          { 
            error: 'Error al ajustar stock', 
            details: stockError instanceof Error ? stockError.message : 'Error desconocido'
          },
          { status: 500 }
        );
      }
    } else {
      console.log(`[CARGA-MANUAL] ⚠️ No se requiere ajuste (cantidad final igual a actual)`);
    }

    // Obtener el stock final real después del ajuste
    const stockFinal = await prisma.stock.findFirst({
      where: {
        productoId,
        ubicacionId: sucursalId
      }
    });

    const cantidadFinalReal = stockFinal?.cantidad || 0;

    console.log(`[CARGA-MANUAL] Stock final real: ${cantidadFinalReal}`);

    // 🆕 Verificar o crear configuración automática si no existe
    try {
      await stockSucursalService.crearConfiguracionAutomatica(
        productoId, 
        sucursalId, 
        user.id, 
        cantidadFinalReal
      );
      console.log(`[CARGA-MANUAL] ✅ Configuración automática verificada/creada`);
    } catch (configError) {
      console.warn(`[CARGA-MANUAL] ⚠️ No se pudo crear/verificar configuración automática:`, configError);
      // No fallar la operación por esto
    }

    // 🆕 Generar/actualizar alertas de stock
    try {
      await stockSucursalService.verificarYGenerarAlertas(productoId, sucursalId);
      console.log(`[CARGA-MANUAL] ✅ Alertas verificadas/actualizadas`);
    } catch (alertError) {
      console.warn(`[CARGA-MANUAL] ⚠️ Error al verificar alertas:`, alertError);
      // No fallar la operación por esto
    }

    // Preparar respuesta completa
    const respuesta = {
      success: true,
      mensaje: `Stock ${modo === 'incrementar' ? 'incrementado' : modo === 'decrementar' ? 'decrementado' : 'establecido'} correctamente`,
      detalles: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
          categoria: producto.categoria?.nombre
        },
        sucursal: {
          id: sucursal.id,
          nombre: sucursal.nombre,
          tipo: sucursal.tipo
        },
        ajuste: {
          modo,
          cantidadAnterior,
          cantidadAjuste,
          cantidadFinal: cantidadFinalReal,
          observaciones
        },
        movimiento: resultadoAjuste?.movimiento ? {
          id: resultadoAjuste.movimiento.id,
          tipo: resultadoAjuste.movimiento.tipoMovimiento,
          cantidad: resultadoAjuste.movimiento.cantidad,
          fecha: resultadoAjuste.movimiento.fecha
        } : null
      },
      timestamp: new Date()
    };

    console.log(`[CARGA-MANUAL] 🏁 Carga manual completada exitosamente`);

    return NextResponse.json(respuesta, { status: 200 });

  } catch (error) {
    console.error('[CARGA-MANUAL] ❌ Error general en carga manual:', error);
    return NextResponse.json(
      { 
        error: 'Error interno al procesar carga manual',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET - Obtener historial de cargas manuales recientes
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    const productoId = searchParams.get('productoId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Buscar movimientos de stock con motivo de carga manual
    const where: any = {
      motivo: {
        contains: 'Carga manual',
        mode: 'insensitive'
      }
    };

    // Filtros adicionales a través de las relaciones
    if (sucursalId || productoId) {
      where.stock = {};
      if (sucursalId) where.stock.ubicacionId = sucursalId;
      if (productoId) where.stock.productoId = productoId;
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimientoStock.findMany({
        where,
        include: {
          stock: {
            include: {
              producto: true,
              ubicacion: true
            }
          },
          usuario: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { fecha: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.movimientoStock.count({ where })
    ]);

    const historial = movimientos.map(mov => ({
      id: mov.id,
      fecha: mov.fecha,
      tipoMovimiento: mov.tipoMovimiento,
      cantidad: mov.cantidad,
      motivo: mov.motivo,
      producto: mov.stock.producto ? {
        id: mov.stock.producto.id,
        nombre: mov.stock.producto.nombre,
        codigoBarras: mov.stock.producto.codigoBarras
      } : null,
      sucursal: {
        id: mov.stock.ubicacion.id,
        nombre: mov.stock.ubicacion.nombre,
        tipo: mov.stock.ubicacion.tipo
      },
      usuario: mov.usuario ? {
        nombre: mov.usuario.name,
        email: mov.usuario.email
      } : null,
      stockResultante: mov.stock.cantidad // Stock después del movimiento
    }));

    return NextResponse.json({
      historial,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      }
    });

  } catch (error) {
    console.error('Error al obtener historial de cargas manuales:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial de cargas manuales' },
      { status: 500 }
    );
  }
}