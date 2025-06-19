// src/app/api/admin/stock-config/bulk-load/route.ts - VERSIÓN CORREGIDA
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

        // ✅ CORREGIDO: Búsqueda mejorada por ID
        if (productoId) {
          console.log(`[BULK-STOCK] Buscando producto por ID: ${productoId}`);
          producto = await prisma.producto.findFirst({
            where: { 
              id: productoId, 
              activo: true 
            }
          });
          console.log(`[BULK-STOCK] Producto encontrado por ID:`, producto ? producto.nombre : 'No encontrado');
        } 
        // Fallback: buscar por código de barras
        else if (codigoBarras) {
          console.log(`[BULK-STOCK] Buscando producto por código: ${codigoBarras}`);
          producto = await prisma.producto.findFirst({
            where: { codigoBarras, activo: true }
          });
        } 
        // Último recurso: buscar por nombre (mejorado)
        else if (nombreProducto) {
          console.log(`[BULK-STOCK] Buscando producto por nombre: ${nombreProducto}`);
          // ✅ MEJORADO: Búsqueda más flexible por nombre
          const searchTerms = nombreProducto.toLowerCase().split(' ').filter((term: string | any[]) => term.length > 2);
          
          // Primero buscar coincidencia exacta
          producto = await prisma.producto.findFirst({
            where: { 
              nombre: { equals: nombreProducto, mode: 'insensitive' },
              activo: true 
            }
          });
          
          // Si no encuentra, buscar por términos individuales
          if (!producto && searchTerms.length > 0) {
            producto = await prisma.producto.findFirst({
              where: { 
                AND: searchTerms.map((term: any) => ({
                  nombre: { contains: term, mode: 'insensitive' }
                })),
                activo: true 
              }
            });
          }
          
          // Último intento: búsqueda parcial
          if (!producto) {
            producto = await prisma.producto.findFirst({
              where: { 
                nombre: { contains: nombreProducto, mode: 'insensitive' },
                activo: true 
              }
            });
          }
        }

        if (!producto) {
          const errorMsg = `Producto no encontrado con los criterios: ID=${productoId}, Código=${codigoBarras}, Nombre=${nombreProducto}`;
          console.error(`[BULK-STOCK] ${errorMsg}`);
          
          // ✅ DEBUGGING: Intentar buscar el producto sin filtro activo para ver si existe
          if (productoId) {
            const productoInactivo = await prisma.producto.findUnique({
              where: { id: productoId }
            });
            if (productoInactivo) {
              throw new Error(`El producto "${productoInactivo.nombre}" existe pero está inactivo`);
            }
          }
          
          throw new Error(errorMsg);
        }

        console.log(`[BULK-STOCK] ✅ Producto encontrado: ${producto.nombre} (ID: ${producto.id})`);

        // Obtener stock actual (puede ser 0 o null)
        const stockActual = await prisma.stock.findFirst({
          where: {
            productoId: producto.id,
            ubicacionId: sucursalId
          }
        });

        const cantidadAnterior = stockActual?.cantidad || 0;
        console.log(`[BULK-STOCK] Stock actual de ${producto.nombre}: ${cantidadAnterior}`);
        
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

        console.log(`[BULK-STOCK] Cálculo para ${producto.nombre}: ${cantidadAnterior} → ${cantidadFinal} (ajuste: ${cantidadAjuste})`);

        // ✅ MEJORADO: Crear stock si no existe
        if (!stockActual && cantidadFinal > 0) {
          console.log(`[BULK-STOCK] Creando stock inicial para ${producto.nombre} en ${sucursal.nombre}`);
          await prisma.stock.create({
            data: {
              productoId: producto.id,
              ubicacionId: sucursalId,
              cantidad: cantidadFinal,
              ultimaActualizacion: new Date()
            }
          });
          
          // Registrar movimiento de entrada
          await prisma.movimientoStock.create({
            data: {
              stockId: (await prisma.stock.findFirst({
                where: { productoId: producto.id, ubicacionId: sucursalId }
              }))!.id,
              tipoMovimiento: 'entrada',
              cantidad: cantidadFinal,
              motivo: `Carga masiva inicial: ${cargaMasiva.nombre}`,
              usuarioId: user.id,
              fecha: new Date()
            }
          });
        }
        // ✅ MEJORADO: Ajustar stock existente solo si hay cambio
        else if (cantidadAjuste !== 0) {
          try {
            await stockService.ajustarStock({
              productoId: producto.id,
              ubicacionId: sucursalId,
              cantidad: cantidadAjuste,
              motivo: `Carga masiva: ${cargaMasiva.nombre}`,
              usuarioId: user.id,
              allowNegative: true // Admin puede hacer ajustes negativos
            });
          } catch (stockError) {
            console.error(`[BULK-STOCK] Error ajustando stock para ${producto.nombre}:`, stockError);
            throw new Error(`Error ajustando stock: ${stockError instanceof Error ? stockError.message : 'Error desconocido'}`);
          }
        }

        // ✅ OBTENER STOCK FINAL REAL después de la operación
        const stockFinalReal = await prisma.stock.findFirst({
          where: {
            productoId: producto.id,
            ubicacionId: sucursalId
          }
        });
        
        const cantidadFinalReal = stockFinalReal?.cantidad || 0;

        // Crear item de carga masiva con valores reales
        await prisma.cargaMasivaStockItem.create({
          data: {
            cargaId: cargaMasiva.id,
            productoId: producto.id,
            codigoBarras: producto.codigoBarras,
            nombreProducto: producto.nombre,
            cantidadCargar: cantidad,
            cantidadAnterior,
            cantidadFinal: cantidadFinalReal, // Usar el valor real de la BD
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
          cantidadFinal: cantidadFinalReal, // Usar el valor real
          estado: 'procesado'
        });

        console.log(`[BULK-STOCK] ✅ Procesado: ${producto.nombre} - ${cantidadAnterior} → ${cantidadFinalReal}`);

      } catch (error) {
        console.error(`[BULK-STOCK] ❌ Error procesando item:`, error);
        itemsErrores++;

        // Crear item con error
        try {
          await prisma.cargaMasivaStockItem.create({
            data: {
              cargaId: cargaMasiva.id,
              codigoBarras: item.codigoBarras,
              nombreProducto: item.nombreProducto || 'Producto desconocido',
              cantidadCargar: item.cantidad || 0,
              estado: 'error',
              error: error instanceof Error ? error.message.substring(0, 500) : 'Error desconocido'
            }
          });
        } catch (dbError) {
          console.error(`[BULK-STOCK] Error guardando item con error:`, dbError);
        }

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

    console.log(`[BULK-STOCK] 🏁 Carga masiva finalizada: ${itemsProcesados} procesados, ${itemsErrores} errores`);

    return NextResponse.json({
      carga: cargaFinalizada,
      resumen: {
        totalItems: items.length,
        itemsProcesados,
        itemsErrores,
        porcentajeExito: Math.round((itemsProcesados / items.length) * 100)
      },
      resultados: resultados.slice(0, 50) // Limitar respuesta para evitar timeouts
    });

  } catch (error) {
    console.error('[BULK-STOCK] ❌ Error general en carga masiva:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar carga masiva de stock',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET - Listar cargas masivas (mantener igual)
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
          },
          _count: {
            select: { items: true }
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