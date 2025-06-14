// src/app/api/admin/stock-config/bulk-load/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { stockService } from '@/server/services/stock/stockService';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const body = await req.json();
    const user = (req as any).user;
    
    const { 
      sucursalId, 
      nombre, 
      descripcion, 
      items, 
      modo = 'incrementar' // 'incrementar', 'establecer', 'decrementar'
    } = body;

    // Validaciones básicas
    if (!sucursalId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sucursal e items son requeridos' },
        { status: 400 }
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

    // Crear registro de carga masiva
    const cargaMasiva = await prisma.cargaMasivaStock.create({
      data: {
        nombre: nombre || `Carga masiva ${new Date().toLocaleDateString()}`,
        descripcion,
        sucursalId,
        usuarioId: user.id,
        totalItems: items.length,
        estado: 'procesando'
      }
    });

    console.log(`[BULK-STOCK] Iniciando carga masiva ${cargaMasiva.id} con ${items.length} items`);

    let itemsProcesados = 0;
    let itemsErrores = 0;
    const resultados = [];

    // Procesar cada item
    for (const item of items) {
      try {
        const { 
          productoId, 
          codigoBarras, 
          nombreProducto, 
          cantidad 
        } = item;

        if (!cantidad || cantidad <= 0) {
          throw new Error('Cantidad debe ser mayor a 0');
        }

        let producto = null;

        // Buscar producto por ID, código de barras o nombre
        if (productoId) {
          producto = await prisma.producto.findUnique({
            where: { id: productoId }
          });
        } else if (codigoBarras) {
          producto = await prisma.producto.findFirst({
            where: { codigoBarras, activo: true }
          });
        } else if (nombreProducto) {
          producto = await prisma.producto.findFirst({
            where: { 
              nombre: { contains: nombreProducto, mode: 'insensitive' },
              activo: true 
            }
          });
        }

        if (!producto) {
          throw new Error('Producto no encontrado');
        }

        // Obtener stock actual
        const stockActual = await prisma.stock.findFirst({
          where: {
            productoId: producto.id,
            ubicacionId: sucursalId
          }
        });

        const cantidadAnterior = stockActual?.cantidad || 0;
        let cantidadAjuste = 0;
        let cantidadFinal = 0;

        // Calcular ajuste según el modo
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
            throw new Error('Modo de carga inválido');
        }

        // Realizar ajuste de stock
        if (cantidadAjuste !== 0) {
          await stockService.ajustarStock({
            productoId: producto.id,
            ubicacionId: sucursalId,
            cantidad: cantidadAjuste,
            motivo: `Carga masiva: ${cargaMasiva.nombre}`,
            usuarioId: user.id,
            allowNegative: true // Admin puede hacer ajustes negativos
          });
        }

        // Crear item de carga masiva
        await prisma.cargaMasivaStockItem.create({
          data: {
            cargaId: cargaMasiva.id,
            productoId: producto.id,
            codigoBarras,
            nombreProducto,
            cantidadCargar: cantidad,
            cantidadAnterior,
            cantidadFinal,
            estado: 'procesado',
            procesadoEn: new Date()
          }
        });

        itemsProcesados++;
        
        resultados.push({
          producto: {
            id: producto.id,
            nombre: producto.nombre,
            codigoBarras: producto.codigoBarras
          },
          cantidadAnterior,
          cantidadAjuste,
          cantidadFinal,
          estado: 'procesado'
        });

      } catch (error) {
        console.error(`[BULK-STOCK] Error procesando item:`, error);
        itemsErrores++;

        // Crear item con error
        await prisma.cargaMasivaStockItem.create({
          data: {
            cargaId: cargaMasiva.id,
            codigoBarras: item.codigoBarras,
            nombreProducto: item.nombreProducto,
            cantidadCargar: item.cantidad || 0,
            estado: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          }
        });

        resultados.push({
          item,
          estado: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Actualizar estado de carga masiva
    const cargaFinalizada = await prisma.cargaMasivaStock.update({
      where: { id: cargaMasiva.id },
      data: {
        estado: itemsErrores === 0 ? 'completado' : 'completado_con_errores',
        itemsProcesados,
        itemsErrores,
        fechaFin: new Date()
      },
      include: {
        sucursal: true,
        usuario: {
          select: { name: true, email: true }
        }
      }
    });

    console.log(`[BULK-STOCK] Carga masiva finalizada: ${itemsProcesados} procesados, ${itemsErrores} errores`);

    return NextResponse.json({
      carga: cargaFinalizada,
      resumen: {
        totalItems: items.length,
        itemsProcesados,
        itemsErrores,
        porcentajeExito: Math.round((itemsProcesados / items.length) * 100)
      },
      resultados
    });

  } catch (error) {
    console.error('Error en carga masiva de stock:', error);
    return NextResponse.json(
      { error: 'Error al procesar carga masiva de stock' },
      { status: 500 }
    );
  }
}

// GET - Listar cargas masivas
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (sucursalId) where.sucursalId = sucursalId;

    const [cargas, total] = await Promise.all([
      prisma.cargaMasivaStock.findMany({
        where,
        include: {
          sucursal: true,
          usuario: {
            select: { name: true, email: true }
          }
        },
        orderBy: { fechaInicio: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.cargaMasivaStock.count({ where })
    ]);

    return NextResponse.json({
      cargas,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      }
    });

  } catch (error) {
    console.error('Error al listar cargas masivas:', error);
    return NextResponse.json(
      { error: 'Error al listar cargas masivas' },
      { status: 500 }
    );
  }
}