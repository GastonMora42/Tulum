// src/app/api/admin/stock-config/dashboard/route.ts - CORREGIDO CON CATEGORÍAS
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');

    // ✅ CORREGIDO: Obtener configuraciones con categorías incluidas
    const configs = await prisma.stockConfigSucursal.findMany({
      where: {
        activo: true,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: {
        producto: {
          include: {
            categoria: true // ✅ INCLUIR CATEGORÍA
          }
        },
        sucursal: true
      }
    });

    // Obtener stocks actuales para todas las configuraciones
    const stocksActuales = await prisma.stock.findMany({
      where: {
        productoId: { in: configs.map(c => c.productoId) },
        ubicacionId: { in: configs.map(c => c.sucursalId) }
      }
    });

    // Crear mapa de stocks actuales para acceso rápido
    const stockMap = new Map();
    stocksActuales.forEach(stock => {
      const key = `${stock.productoId}-${stock.ubicacionId}`;
      stockMap.set(key, stock.cantidad);
    });

    // ✅ CORREGIDO: Calcular estadísticas por configuración con categorías
    const analisisStock = configs.map(config => {
      const key = `${config.productoId}-${config.sucursalId}`;
      const cantidadActual = stockMap.get(key) || 0;
      
      const diferencia = config.stockMaximo - cantidadActual;
      const porcentajeUso = config.stockMaximo > 0 ? (cantidadActual / config.stockMaximo) * 100 : 0;
      
      // Determinar estado
      let estado = 'normal';
      let prioridad = 0;
      
      if (cantidadActual <= config.stockMinimo) {
        estado = 'critico';
        prioridad = 4;
      } else if (cantidadActual <= config.puntoReposicion) {
        estado = 'bajo';
        prioridad = 3;
      } else if (cantidadActual > config.stockMaximo) {
        estado = 'exceso';
        prioridad = 2;
      } else {
        estado = 'normal';
        prioridad = 1;
      }

      return {
        id: config.id,
        producto: {
          id: config.producto.id,
          nombre: config.producto.nombre,
          codigoBarras: config.producto.codigoBarras,
          categoriaId: config.producto.categoriaId, // ✅ AGREGAR categoriaId
          categoria: config.producto.categoria ? { // ✅ AGREGAR categoría completa
            id: config.producto.categoria.id,
            nombre: config.producto.categoria.nombre
          } : null
        },
        sucursal: {
          id: config.sucursal.id,
          nombre: config.sucursal.nombre,
          tipo: config.sucursal.tipo
        },
        configuracion: {
          stockMaximo: config.stockMaximo,
          stockMinimo: config.stockMinimo,
          puntoReposicion: config.puntoReposicion
        },
        stockActual: cantidadActual,
        diferencia,
        diferenciaPorcentual: config.stockMaximo > 0 ? Math.round((diferencia / config.stockMaximo) * 100) : 0,
        porcentajeUso: Math.round(porcentajeUso),
        estado,
        prioridad,
        tieneConfiguracion: true, // ✅ AGREGAR flag
        acciones: {
          necesitaReposicion: cantidadActual <= config.puntoReposicion,
          puedeCargar: cantidadActual < config.stockMaximo,
          cantidadSugerida: Math.max(0, config.stockMaximo - cantidadActual),
          tieneExceso: cantidadActual > config.stockMaximo,
          excesoActual: Math.max(0, cantidadActual - config.stockMaximo)
        }
      };
    });

    // ✅ NUEVO: Obtener productos con stock pero sin configuración (para completar el dashboard)
    const stocksSinConfig = await prisma.stock.findMany({
      where: {
        ...(sucursalId ? { ubicacionId: sucursalId } : {}),
        productoId: { not: null },
        cantidad: { gt: 0 },
        // Excluir productos que ya tienen configuración
        NOT: {
          productoId: {
            in: configs.map(c => c.productoId)
          }
        }
      },
      include: {
        producto: {
          include: {
            categoria: true // ✅ INCLUIR CATEGORÍA también aquí
          }
        },
        ubicacion: true
      }
    });

    // ✅ NUEVO: Agregar productos sin configuración al análisis
    const analisisSinConfig = stocksSinConfig.map(stock => {
      const producto = stock.producto!;
      const stockActual = stock.cantidad;
      
      // Valores por defecto para productos sin configuración
      const stockMinimo = Math.max(producto.stockMinimo, 1);
      const stockMaximo = Math.max(stockActual * 3, stockMinimo * 5, 10);
      const puntoReposicion = Math.ceil(stockMinimo * 1.5);
      
      // Determinar estado con configuración por defecto
      let estado = 'normal';
      let prioridad = 0;
      
      if (stockActual <= stockMinimo) {
        estado = 'critico';
        prioridad = 4;
      } else if (stockActual <= puntoReposicion) {
        estado = 'bajo';
        prioridad = 3;
      } else if (stockActual > stockMaximo) {
        estado = 'exceso';
        prioridad = 2;
      } else {
        estado = 'normal';
        prioridad = 1;
      }

      const diferencia = stockMaximo - stockActual;
      const porcentajeUso = stockMaximo > 0 ? (stockActual / stockMaximo) * 100 : 0;

      return {
        id: `sin-config-${stock.id}`,
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
          categoriaId: producto.categoriaId, // ✅ INCLUIR categoriaId
          categoria: producto.categoria ? { // ✅ INCLUIR categoría
            id: producto.categoria.id,
            nombre: producto.categoria.nombre
          } : null
        },
        sucursal: {
          id: stock.ubicacion.id,
          nombre: stock.ubicacion.nombre,
          tipo: stock.ubicacion.tipo
        },
        configuracion: {
          stockMaximo,
          stockMinimo,
          puntoReposicion
        },
        stockActual,
        diferencia,
        diferenciaPorcentual: stockMaximo > 0 ? Math.round((diferencia / stockMaximo) * 100) : 0,
        porcentajeUso: Math.round(porcentajeUso),
        estado,
        prioridad,
        tieneConfiguracion: false, // ✅ MARCAR como sin configuración
        requiereConfiguracion: true, // ✅ FLAG adicional
        acciones: {
          necesitaReposicion: stockActual <= puntoReposicion,
          puedeCargar: stockActual < stockMaximo,
          cantidadSugerida: Math.max(0, stockMaximo - stockActual),
          tieneExceso: stockActual > stockMaximo,
          excesoActual: Math.max(0, stockActual - stockMaximo)
        }
      };
    });

    // ✅ CORREGIDO: Combinar análisis y ordenar alfabéticamente por nombre de producto
    const analisisCompleto = [...analisisStock, ...analisisSinConfig]
      .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es', { sensitivity: 'base' }));

    // Estadísticas generales
    const estadisticas = {
      total: analisisCompleto.length,
      conConfiguracion: analisisStock.length,
      sinConfiguracion: analisisSinConfig.length,
      criticos: analisisCompleto.filter(a => a.estado === 'critico').length,
      bajos: analisisCompleto.filter(a => a.estado === 'bajo').length,
      normales: analisisCompleto.filter(a => a.estado === 'normal').length,
      excesos: analisisCompleto.filter(a => a.estado === 'exceso').length,
      necesitanReposicion: analisisCompleto.filter(a => a.acciones.necesitaReposicion).length,
      conExceso: analisisCompleto.filter(a => a.acciones.tieneExceso).length
    };

    // Resumen por sucursal
    const resumenSucursales = analisisCompleto.reduce((acc, item) => {
      const sucursalId = item.sucursal.id;
      
      if (!acc[sucursalId]) {
        acc[sucursalId] = {
          sucursal: item.sucursal,
          total: 0,
          criticos: 0,
          bajos: 0,
          normales: 0,
          excesos: 0
        };
      }

      acc[sucursalId].total++;
      acc[sucursalId][item.estado + 's']++;

      return acc;
    }, {} as Record<string, any>);

    // Top productos con mayor déficit (ordenados alfabéticamente también)
    const topDeficit = analisisCompleto
      .filter(a => a.diferencia > 0)
      .sort((a, b) => b.diferencia - a.diferencia)
      .slice(0, 10);

    // Top productos con mayor exceso (ordenados alfabéticamente también)
    const topExceso = analisisCompleto
      .filter(a => a.acciones.tieneExceso)
      .sort((a, b) => b.acciones.excesoActual - a.acciones.excesoActual)
      .slice(0, 10);

    console.log(`[Dashboard] ✅ Dashboard generado: ${analisisCompleto.length} productos (${analisisStock.length} con config, ${analisisSinConfig.length} sin config)`);

    return NextResponse.json({
      estadisticas,
      resumenSucursales: Object.values(resumenSucursales),
      analisisCompleto,
      topDeficit,
      topExceso,
      ultimaActualizacion: new Date()
    });

  } catch (error) {
    console.error('Error al generar dashboard de stock:', error);
    return NextResponse.json(
      { error: 'Error al generar dashboard de stock' },
      { status: 500 }
    );
  }
}